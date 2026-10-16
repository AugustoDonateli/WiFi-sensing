"""Regressor temporal pequeno para seis articulações; arquitetura própria de referência.

Não é uma reprodução do CSIPose nem usa seus pesos. Só gera um checkpoint após
treinamento supervisionado com sessões distintas. V0 é offline e condicional à
presença conhecida de uma pessoa; não inclui detector de presença.
"""

from copy import deepcopy
from pathlib import Path
import random

import numpy as np
import torch
from torch import nn

from . import JOINTS, VERSION
from .data import load_bundle


class PoseNet(nn.Module):
    def __init__(self, bins=20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv1d(193,32,3,padding=1), nn.GELU(),
            nn.Conv1d(32,64,3,padding=1), nn.GELU(),
            nn.Flatten(), nn.Linear(64*bins,64), nn.GELU(), nn.Dropout(.1),
            nn.Linear(64,12), nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x.transpose(1,2)).reshape(-1,6,2)


def contract(meta):
    return {k:meta[k] for k in ("schema","config","profile","feature_layout","joint_names","data_kind","clock")}


def disjoint(left, right):
    a = {d["meta"]["session"].casefold() for d in left}
    b = {d["meta"]["session"].casefold() for d in right}
    ah = {d["meta"]["source_sha256"] for d in left}
    bh = {d["meta"]["source_sha256"] for d in right}
    if a & b or ah & bh:
        raise ValueError("Treino/validação/teste compartilham sessão ou arquivo bruto. Separe sessões inteiras.")


def load_group(paths, expected=None, labeled=True):
    data = [load_bundle(p) for p in paths]
    if not data:
        raise ValueError("Informe ao menos um conjunto por grupo.")
    hashes = [d["meta"]["source_sha256"] for d in data]
    if len(hashes) != len(set(hashes)):
        raise ValueError("Coleta bruta duplicada dentro do grupo.")
    expected = expected or contract(data[0]["meta"])
    for d in data:
        meta = d["meta"]
        if contract(meta) != expected:
            raise ValueError("Perfil de rádio, preparação ou origem sintética/medida incompatível com o modelo.")
        if labeled and (not meta.get("has_labels") or not d["label_mask"].any()):
            raise ValueError("Falta gabarito sincronizado de articulações; rótulo 'andando' não é pose.")
        if labeled and meta["session"].casefold() == "s0":
            raise ValueError("S0 é diagnóstico da montagem; use novas sessões com gabarito de pose.")
        if labeled and meta.get("image_size") != data[0]["meta"].get("image_size"):
            raise ValueError("Dimensões da câmera variam dentro do grupo.")
    return data


def joined(data):
    parts = []
    for d in data:
        use = d["valid"] & (d["label_mask"].sum(axis=1) >= 4)
        parts.append({k:d[k][use] for k in ("x","observed","y","label_mask")})
    return {k:np.concatenate([p[k] for p in parts]) for k in parts[0]}


def fit_normalization(x, observed):
    values = x[observed]
    if not len(values):
        raise ValueError("Não há bins observados no treino.")
    return values.mean(axis=0).astype(np.float32), np.maximum(values.std(axis=0),1e-4).astype(np.float32)


def encode(x, observed, mean, std):
    scaled = ((x-mean)/std).astype(np.float32)
    scaled[~observed] = 0
    # Máscara entra como canal explícito; RSSI/volume são dados, tempo/ID/sessão não.
    return np.concatenate((scaled,observed[:,:,None].astype(np.float32)),axis=2)


def masked_loss(prediction, target, mask):
    if not mask.any():
        raise ValueError("Batch sem articulações visíveis.")
    point_loss = nn.functional.smooth_l1_loss(prediction,target,reduction="none").mean(dim=-1)
    return point_loss[mask].mean()


def predict_array(model, encoded, batch_size=128):
    model.eval()
    if len(encoded) == 0:
        return np.empty((0,6,2),np.float32)
    parts = []
    with torch.inference_mode():
        for start in range(0,len(encoded),batch_size):
            parts.append(model(torch.from_numpy(encoded[start:start+batch_size])).numpy())
    result = np.concatenate(parts)
    if not np.isfinite(result).all():
        raise ValueError("Modelo produziu coordenadas não finitas.")
    return result


def train(train_paths, val_paths, destination, epochs=100, patience=15, seed=42, learning_rate=1e-3):
    if epochs < 1 or patience < 1 or not np.isfinite(learning_rate) or learning_rate <= 0:
        raise ValueError("Parâmetros de treinamento inválidos.")
    if Path(destination).exists():
        raise ValueError("Checkpoint já existe; escolha um novo nome para preservar o experimento.")
    training = load_group(train_paths)
    validation = load_group(val_paths,expected=contract(training[0]["meta"]))
    disjoint(training,validation)
    image_size = training[0]["meta"]["image_size"]
    if validation[0]["meta"]["image_size"] != image_size:
        raise ValueError("Dimensões da câmera diferem entre treino e validação.")
    tr, va = joined(training), joined(validation)
    if len(tr["x"]) < 32 or len(va["x"]) < 16:
        raise ValueError("Poucos exemplos válidos: mínimo técnico 32 no treino e 16 na validação (não garante generalização).")
    if np.any(tr["label_mask"].sum(axis=0) < 8) or np.any(va["label_mask"].sum(axis=0) < 4):
        raise ValueError("Cada articulação precisa de exemplos visíveis nos dois grupos.")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(2)
    torch.use_deterministic_algorithms(True)
    mean,std = fit_normalization(tr["x"],tr["observed"])
    xt = torch.from_numpy(encode(tr["x"],tr["observed"],mean,std))
    xv = torch.from_numpy(encode(va["x"],va["observed"],mean,std))
    yt,mt = torch.from_numpy(tr["y"]),torch.from_numpy(tr["label_mask"])
    yv,mv = torch.from_numpy(va["y"]),torch.from_numpy(va["label_mask"])
    model = PoseNet(training[0]["meta"]["config"]["bins"])
    optimizer = torch.optim.AdamW(model.parameters(),lr=learning_rate,weight_decay=1e-4)
    best_loss, best, best_epoch, stale, history = float("inf"), None, 0, 0, []
    for epoch in range(1,epochs+1):
        model.train()
        order = torch.randperm(len(xt))
        for batch in order.split(64):
            optimizer.zero_grad(set_to_none=True)
            loss = masked_loss(model(xt[batch]),yt[batch],mt[batch])
            if not torch.isfinite(loss):
                raise ValueError("Loss não finito no treino; checkpoint não será salvo.")
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(),1.0,error_if_nonfinite=True)
            optimizer.step()
        model.eval()
        # Inferência em blocos evita carregar um vídeo inteiro em ativações do modelo.
        p = predict_array(model,xv.numpy())
        val_loss = float(masked_loss(torch.from_numpy(p),yv,mv))
        if not np.isfinite(val_loss):
            raise ValueError("Loss de validação não finito.")
        history.append({"epoch":epoch,"validation_loss":val_loss})
        if val_loss < best_loss-1e-8:
            best_loss,best,best_epoch,stale = val_loss,deepcopy(model.state_dict()),epoch,0
        else:
            stale += 1
        if stale >= patience:
            break
    mean_pose = np.stack([tr["y"][tr["label_mask"][:,j],j].mean(axis=0) for j in range(6)])
    meta = {
        "schema":1,"version":VERSION,"architecture":"temporal_conv_v0","contract":contract(training[0]["meta"]),
        "image_size":image_size,"seed":seed,"best_epoch":best_epoch,"epochs_run":len(history),
        "training_frames":len(xt),"validation_frames":len(xv),"best_validation_loss":best_loss,
        "training_sessions":sorted({d["meta"]["session"] for d in training}),
        "validation_sessions":sorted({d["meta"]["session"] for d in validation}),
        "used_source_sha256":[d["meta"]["source_sha256"] for d in training+validation],
        "label_source_sha256":[d["meta"]["label_source_sha256"] for d in training+validation],
        "sync_source_sha256":[d["meta"]["sync_source_sha256"] for d in training+validation],
        "numpy_version":np.__version__,"torch_version":str(torch.__version__),
        "history":history,"scope":"Uma pessoa conhecida, seis articulações 2D; sem validação no mundo real por padrão.",
        "physical_pose_validated":False,
    }
    checkpoint = {"metadata":meta,"state_dict":best,"feature_mean":torch.from_numpy(mean),
                  "feature_std":torch.from_numpy(std),"mean_pose":torch.from_numpy(mean_pose)}
    dest = Path(destination)
    dest.parent.mkdir(parents=True,exist_ok=True)
    torch.save(checkpoint,dest)
    return meta


def load_model(path):
    saved = torch.load(path,map_location="cpu",weights_only=True)
    meta = saved["metadata"]
    if meta.get("schema") != 1 or meta.get("architecture") != "temporal_conv_v0":
        raise ValueError("Checkpoint incompatível com Wave Sense Pose v0.")
    if meta["contract"]["joint_names"] != list(JOINTS):
        raise ValueError("Ordem das articulações incompatível.")
    model = PoseNet(meta["contract"]["config"]["bins"])
    model.load_state_dict(saved["state_dict"],strict=True)
    for key,shape in (("feature_mean",(192,)),("feature_std",(192,)),("mean_pose",(6,2))):
        if tuple(saved[key].shape) != shape or not torch.isfinite(saved[key]).all():
            raise ValueError(f"Checkpoint contém {key} inválido.")
    if not torch.all(saved["feature_std"] > 0):
        raise ValueError("Desvio padrão do checkpoint inválido.")
    model.eval()
    return model,saved


def infer(data, model, saved):
    if contract(data["meta"]) != saved["metadata"]["contract"]:
        raise ValueError("Coleta incompatível com o modelo (inclui bloqueio de modelo sintético em dados reais).")
    encoded = encode(data["x"][data["valid"]], data["observed"][data["valid"]],
                     saved["feature_mean"].numpy(),saved["feature_std"].numpy())
    predicted = predict_array(model,encoded)
    result = np.full((len(data["times"]),6,2),np.nan,np.float32)
    result[data["valid"]] = predicted
    return result


def pose_metrics(prediction, truth, mask, image_size):
    if not mask.any():
        raise ValueError("Não há articulações válidas para avaliar.")
    scale = np.array(image_size,dtype=float)
    if not np.isfinite(prediction[mask]).all():
        raise ValueError("Previsão inválida em uma articulação avaliada.")
    distances = np.linalg.norm((prediction-truth)*scale,axis=-1)
    diagonal = float(np.linalg.norm(scale))
    def metrics(values):
        if len(values) == 0:
            return {"joints":0,"mean_error_px":None,"mean_error_pct_diagonal":None,"pck_0_05_diagonal":None}
        return {"joints":len(values),"mean_error_px":float(values.mean()),
                "mean_error_pct_diagonal":float(values.mean()/diagonal*100),
                "pck_0_05_diagonal":float((values <= .05*diagonal).mean())}
    return dict(metrics(distances[mask]),per_joint={j:metrics(distances[:,i][mask[:,i]]) for i,j in enumerate(JOINTS)})


def evaluate(paths, checkpoint, seed=42):
    model,saved = load_model(checkpoint)
    meta = saved["metadata"]
    datasets = load_group(paths,expected=meta["contract"])
    forbidden_sessions = {s.casefold() for s in meta["training_sessions"]+meta["validation_sessions"]}
    for d in datasets:
        if d["meta"]["session"].casefold() in forbidden_sessions or d["meta"]["source_sha256"] in meta["used_source_sha256"]:
            raise ValueError("Avaliação exige sessão/arquivo fora do treino e da validação.")
        if d["meta"]["image_size"] != meta["image_size"]:
            raise ValueError("Dimensões de imagem do teste não correspondem ao modelo.")
    pred,truth,masks,shuffled = [],[],[],[]
    rng = np.random.default_rng(seed)
    coverage = []
    for d in datasets:
        p = infer(d,model,saved)
        use = d["valid"] & (d["label_mask"].sum(axis=1) >= 4)
        if use.sum() < 2:
            raise ValueError("Teste com menos de dois frames rotulados e válidos.")
        p = p[use]
        pred.append(p)
        # Embaralha as janelas do mesmo arquivo: controle de alinhamento, não teste estatístico.
        shuffled.append(p[rng.permutation(len(p))])
        truth.append(d["y"][use])
        masks.append(d["label_mask"][use])
        labeled = d["label_mask"].sum(axis=1) >= 4
        coverage.append({"source":d["meta"]["source_name"],"session":d["meta"]["session"],
                         "all_windows":len(use),"quality_accepted":int(d["valid"].sum()),
                         "labeled_windows":int(labeled.sum()),"scored_windows":int(use.sum()),
                         "scored_fraction_of_labeled":float(use.sum()/max(1,labeled.sum()))})
    p,y,m = np.concatenate(pred),np.concatenate(truth),np.concatenate(masks)
    base = np.broadcast_to(saved["mean_pose"].numpy(),y.shape)
    return {"schema":1,"data_kind":meta["contract"]["data_kind"],"scope":meta["scope"],
            "metrics_note":"Sem alinhamento pela pose verdadeira; erro em pixels/diagonal, não centímetros. PCK não é acurácia de detecção.",
            "model":pose_metrics(p,y,m,meta["image_size"]),
            "mean_pose_baseline":pose_metrics(base,y,m,meta["image_size"]),
            "shuffled_csi_control":pose_metrics(np.concatenate(shuffled),y,m,meta["image_size"]),
            "coverage":coverage,"shuffle_seed":seed,
            "note":"Um relatório numérico não certifica generalização. Avaliar também novos movimentos, dias, pessoas e montagens."}
