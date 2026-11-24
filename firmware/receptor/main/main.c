/* Wave Sense, Placa B (receptor), firmware versão 2.
 *
 * Mede o CSI das sondas da Placa A e manda pela USB no mesmo formato CSI_DATA do csi_recv
 * oficial (a tela e as ferramentas leem sem mudança). O que mudou e por quê:
 *
 *  1. Sem modo promíscuo. O oficial liga o promíscuo e escuta TODOS os pacotes do canal; numa
 *     feira são milhares por segundo disputando a mesma placa. Agora o rádio descarta no próprio
 *     hardware o que não é para a B.
 *  2. A impressão saiu da tarefa do Wi-Fi. O oficial escreve cada linha (~1.280 letras, ~14 ms a
 *     921600 baud) dentro da função chamada pelo Wi-Fi; enquanto escreve, a placa não atende o
 *     rádio. A própria Espressif manda não fazer isso. Agora a medida vai para uma fila e outra
 *     tarefa escreve.
 *  3. Só o bloco LLTF (128 números em vez de 384): é o único que o detector usa, a linha fica com
 *     metade do tamanho e a USB aguenta ~140 linhas por segundo.
 *  4. Uma linha WS_STAT por segundo diz onde os pacotes se perdem (na A, no ar ou na USB).
 *  5. Comandos pela USB: "canal N" (troca o canal das duas placas), "varrer" (mede como está cada
 *     canal e indica o mais livre) e "estado".
 *  6. Se a A some por 3 s, a B procura a A em todos os canais.
 */
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/uart_vfs.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_now.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "ws_protocolo.h"
#include "ws_radio.h"

#define UART_CONSOLE CONFIG_ESP_CONSOLE_UART_NUM
#define CSI_MAX 128            /* bloco LLTF: 64 subportadoras x (imag, real) */
#define FILA_CSI 64
#define SILENCIO_PROCURA_MS 3000
#define ESPERA_CANAL_PROCURA_MS 300
#define ESPERA_CANAL_VARREDURA_MS 300

static const char *TAG = "placa_B";
static const uint8_t MAC_A[6] = WS_MAC_A;
static const uint8_t MAC_B[6] = WS_MAC_B;

typedef struct {
    wifi_pkt_rx_ctrl_t rx;
    uint32_t seq;
    uint16_t len;
    uint8_t primeira_invalida;
    int8_t csi[CSI_MAX];
} medida_t;

typedef enum { PEDIDO_CANAL, PEDIDO_VARRER, PEDIDO_ESTADO } tipo_pedido_t;
typedef struct {
    tipo_pedido_t tipo;
    uint8_t canal;
} pedido_t;

static QueueHandle_t s_fila_csi, s_fila_pedidos;
static SemaphoreHandle_t s_enviado;
static volatile bool s_envio_ok;

/* Contadores escritos na tarefa do Wi-Fi e lidos pelas outras (32 bits: leitura atômica). */
static volatile uint32_t s_recebidos, s_repetidos, s_fila_cheia;
static volatile int32_t s_soma_rssi, s_soma_ruido;
static volatile uint32_t s_ultimo_seq, s_a_sem_resposta, s_a_nao_saiu, s_a_freq;
static volatile bool s_tem_seq, s_tem_sonda;
static volatile uint32_t s_ultima_rx_ms;   /* 32 bits: lida inteira de uma vez */

typedef enum { ESTADO_OK, ESTADO_PROCURANDO, ESTADO_VARRENDO, ESTADO_TROCANDO } estado_t;
static volatile estado_t s_estado = ESTADO_OK;

static inline uint32_t agora_ms(void)
{
    return (uint32_t)(esp_timer_get_time() / 1000);
}
static uint8_t s_canal;   /* canal combinado com a A (o salvo na memória) */

/* ---------- Saída pela USB ---------- */

/* Uma linha inteira por chamada: o driver da UART tem trava, então linhas de tarefas diferentes
 * não se misturam. */
static void saida(const char *fmt, ...)
{
    char buf[256];
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    if (n > 0) {
        uart_write_bytes(UART_CONSOLE, buf, n < (int)sizeof(buf) ? n : (int)sizeof(buf) - 1);
    }
}

static inline char *escreve_int(char *p, int v)
{
    char tmp[12];
    int n = 0;
    unsigned u = v < 0 ? (unsigned)(-v) : (unsigned)v;
    if (v < 0) {
        *p++ = '-';
    }
    do {
        tmp[n++] = (char)('0' + u % 10);
        u /= 10;
    } while (u);
    while (n) {
        *p++ = tmp[--n];
    }
    return p;
}

static void tarefa_saida(void *arg)
{
    static char linha[160 + CSI_MAX * 5];
    medida_t m;
    for (;;) {
        if (xQueueReceive(s_fila_csi, &m, portMAX_DELAY) != pdTRUE) {
            continue;
        }
        const wifi_pkt_rx_ctrl_t *r = &m.rx;
        /* Mesmas 25 colunas do csi_recv oficial (ramo do ESP32). */
        int n = snprintf(linha, 160,
                         "CSI_DATA,%lu," MACSTR ",%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%lu,%d,%d,%d,%d,%d,\"[",
                         (unsigned long)m.seq, MAC2STR(MAC_A), r->rssi, r->rate, r->sig_mode,
                         r->mcs, r->cwb, r->smoothing, r->not_sounding,
                         r->aggregation, r->stbc, r->fec_coding, r->sgi,
                         r->noise_floor, r->ampdu_cnt, r->channel, r->secondary_channel,
                         (unsigned long)r->timestamp, r->ant, r->sig_len, r->rx_state,
                         m.len, m.primeira_invalida);
        if (n <= 0 || n >= 160) {
            continue;
        }
        char *p = linha + n;
        for (int i = 0; i < m.len; i++) {
            if (i) {
                *p++ = ',';
            }
            p = escreve_int(p, m.csi[i]);
        }
        *p++ = ']';
        *p++ = '"';
        *p++ = '\n';
        uart_write_bytes(UART_CONSOLE, linha, p - linha);
    }
}

/* ---------- Recepção (roda na tarefa do Wi-Fi: tem que ser rápida) ---------- */

static void ao_receber_csi(void *ctx, wifi_csi_info_t *info)
{
    if (!info || !info->buf || memcmp(info->mac, MAC_A, 6) != 0 || s_estado == ESTADO_VARRENDO) {
        return;
    }
    uint32_t seq = 0;
    bool tem_seq = false;
    /* Corpo do quadro: pelo ponteiro do payload ou, se faltar, logo depois do cabeçalho 802.11
     * (24 bytes; sig_len inclui os 4 bytes finais de verificação). */
    const uint8_t *corpo = info->payload;
    int tam = info->payload_len;
    if (!corpo && info->hdr) {
        corpo = info->hdr + 24;
        tam = (int)info->rx_ctrl.sig_len - 24 - 4;
    }
    if (corpo && tam >= WS_DESLOCAMENTO_CORPO + 4) {
        memcpy(&seq, corpo + WS_DESLOCAMENTO_CORPO, 4);
        tem_seq = true;
        if (tam >= WS_DESLOCAMENTO_CORPO + (int)sizeof(ws_sonda_t)) {
            ws_sonda_t s;
            memcpy(&s, corpo + WS_DESLOCAMENTO_CORPO, sizeof(s));
            if (s.magico == WS_MAGICO_SONDA) {
                s_a_sem_resposta = s.sem_resposta;
                s_a_nao_saiu = s.nao_saiu;
                s_a_freq = s.freq_hz;
                s_tem_sonda = true;
            }
        }
    }
    /* No unicast, se o ACK da B se perde, a A repete uma sonda que já chegou: conta uma vez só. */
    if (tem_seq && s_tem_seq && seq == s_ultimo_seq) {
        s_repetidos++;
        return;
    }
    if (tem_seq) {
        s_ultimo_seq = seq;
        s_tem_seq = true;
    } else {
        static uint32_t contador;   /* sem o corpo não há como saber o que se perdeu */
        seq = contador++;
    }
    s_recebidos++;
    s_soma_rssi += info->rx_ctrl.rssi;
    s_soma_ruido += info->rx_ctrl.noise_floor;
    s_ultima_rx_ms = agora_ms();

    medida_t m;
    m.rx = info->rx_ctrl;
    m.seq = seq;
    m.len = info->len < CSI_MAX ? info->len : CSI_MAX;
    m.primeira_invalida = info->first_word_invalid ? 1 : 0;
    memcpy(m.csi, info->buf, m.len);
    if (xQueueSend(s_fila_csi, &m, 0) != pdTRUE) {
        s_fila_cheia++;   /* a USB não deu conta: a medida existe, mas não cabe na linha */
    }
}

static void ao_enviar(const esp_now_send_info_t *info, esp_now_send_status_t status)
{
    s_envio_ok = (status == ESP_NOW_SEND_SUCCESS);
    xSemaphoreGive(s_enviado);
}

/* ---------- Varredura dos canais ---------- */

static volatile uint32_t s_v_quadros, s_v_ar_us;
static volatile int32_t s_v_soma_ruido;
static volatile uint32_t s_v_n_ruido;

/* Tempo no ar de um quadro, aproximado pela taxa e pelo tamanho. */
static uint32_t duracao_us(const wifi_pkt_rx_ctrl_t *c)
{
    float mbps = 6;
    uint32_t preambulo = 20;
    if (c->sig_mode == 0) {
        switch (c->rate) {
        case 0x00: mbps = 1; preambulo = 192; break;
        case 0x01: mbps = 2; preambulo = 192; break;
        case 0x02: mbps = 5.5f; preambulo = 192; break;
        case 0x03: mbps = 11; preambulo = 192; break;
        case 0x05: mbps = 2; preambulo = 96; break;
        case 0x06: mbps = 5.5f; preambulo = 96; break;
        case 0x07: mbps = 11; preambulo = 96; break;
        case 0x08: mbps = 48; break;
        case 0x09: mbps = 24; break;
        case 0x0A: mbps = 12; break;
        case 0x0B: mbps = 6; break;
        case 0x0C: mbps = 54; break;
        case 0x0D: mbps = 36; break;
        case 0x0E: mbps = 18; break;
        case 0x0F: mbps = 9; break;
        default: break;
        }
    } else {
        static const float ht20[8] = {6.5f, 13, 19.5f, 26, 39, 52, 58.5f, 65};
        mbps = ht20[c->mcs % 8] * (float)(c->mcs / 8 + 1);
        if (c->cwb) {
            mbps *= 2.077f;
        }
        preambulo = 36;
    }
    return preambulo + (uint32_t)((float)c->sig_len * 8.0f / mbps);
}

static void ao_promiscuo(void *buf, wifi_promiscuous_pkt_type_t tipo)
{
    if (s_estado != ESTADO_VARRENDO || !buf) {
        return;
    }
    const wifi_promiscuous_pkt_t *p = (const wifi_promiscuous_pkt_t *)buf;
    /* As sondas da própria A não contam como ocupação. */
    if (tipo != WIFI_PKT_MISC && p->rx_ctrl.sig_len >= 16 && memcmp(p->payload + 10, MAC_A, 6) == 0) {
        return;
    }
    s_v_quadros++;
    s_v_ar_us += duracao_us(&p->rx_ctrl);
    s_v_soma_ruido += p->rx_ctrl.noise_floor;
    s_v_n_ruido++;
}

static void ir_para(uint8_t canal)
{
    if (ws_radio_canal(canal) == ESP_OK) {
        s_tem_seq = false;
    }
}

static void varrer(void)
{
    const int N = WS_CANAL_MAX - WS_CANAL_MIN + 1;
    float ocup[WS_CANAL_MAX + 1] = {0};
    uint32_t quadros[WS_CANAL_MAX + 1] = {0};
    int ruido[WS_CANAL_MAX + 1] = {0};

    s_estado = ESTADO_VARRENDO;
    saida("WS_INFO,varrendo os canais de %d a %d (%d ms cada)\n", WS_CANAL_MIN, WS_CANAL_MAX, ESPERA_CANAL_VARREDURA_MS);
    wifi_promiscuous_filter_t filtro = {.filter_mask = WIFI_PROMIS_FILTER_MASK_ALL};
    esp_wifi_set_promiscuous_filter(&filtro);
    esp_wifi_set_promiscuous_rx_cb(ao_promiscuo);
    esp_wifi_set_promiscuous(true);
    for (int ch = WS_CANAL_MIN; ch <= WS_CANAL_MAX; ch++) {
        ir_para(ch);
        vTaskDelay(pdMS_TO_TICKS(20));          /* deixa o rádio assentar */
        s_v_quadros = 0;
        s_v_ar_us = 0;
        s_v_soma_ruido = 0;
        s_v_n_ruido = 0;
        vTaskDelay(pdMS_TO_TICKS(ESPERA_CANAL_VARREDURA_MS));
        quadros[ch] = s_v_quadros;
        float o = (float)s_v_ar_us / (ESPERA_CANAL_VARREDURA_MS * 1000.0f);
        ocup[ch] = o > 1 ? 1 : o;
        ruido[ch] = s_v_n_ruido ? (int)(s_v_soma_ruido / (int32_t)s_v_n_ruido) : 0;
    }
    esp_wifi_set_promiscuous(false);
    ir_para(s_canal);

    /* Um canal de 20 MHz encosta nos vizinhos: quem está a 1, 2 ou 3 canais de distância também
     * disputa o ar. Nota = ocupação do canal + parte da ocupação dos vizinhos. */
    static const float peso[4] = {1.0f, 0.75f, 0.5f, 0.25f};
    int melhor = s_canal;
    float nota_melhor = 1e9f;
    for (int ch = WS_CANAL_MIN; ch <= WS_CANAL_MAX; ch++) {
        float nota = 0;
        for (int d = -3; d <= 3; d++) {
            int k = ch + d;
            if (k >= WS_CANAL_MIN && k <= WS_CANAL_MAX) {
                nota += ocup[k] * peso[d < 0 ? -d : d];
            }
        }
        saida("WS_VARREDURA,%d,%lu,%d,%d,%d\n", ch, (unsigned long)quadros[ch],
              (int)(ocup[ch] * 100 + 0.5f), (int)(nota * 100 + 0.5f), ruido[ch]);
        /* Empate (diferença menor que 1 ponto): fica com o canal atual. */
        if (nota < nota_melhor - 0.01f || (nota < nota_melhor + 0.01f && ch == s_canal)) {
            nota_melhor = nota;
            melhor = ch;
        }
    }
    (void)N;
    saida("WS_VARREDURA,fim,%d\n", melhor);
    s_ultima_rx_ms = agora_ms();   /* não começa a procurar a A logo depois */
    s_estado = ESTADO_OK;
}

/* ---------- Troca de canal e procura da A ---------- */

static void trocar_canal(uint8_t novo)
{
    if (!ws_canal_valido(novo)) {
        saida("WS_CANAL,%d,erro_canal_invalido\n", s_canal);
        return;
    }
    if (novo == s_canal) {
        saida("WS_CANAL,%d,ok\n", s_canal);
        return;
    }
    s_estado = ESTADO_TROCANDO;
    ws_comando_t cmd = {.magico = WS_MAGICO_COMANDO, .tipo = WS_CMD_CANAL, .canal = novo};
    bool confirmou = false;
    for (int i = 0; i < 15 && !confirmou; i++) {
        xSemaphoreTake(s_enviado, 0);
        if (esp_now_send(MAC_A, (const uint8_t *)&cmd, sizeof(cmd)) == ESP_OK &&
                xSemaphoreTake(s_enviado, pdMS_TO_TICKS(100)) == pdTRUE && s_envio_ok) {
            confirmou = true;
        } else {
            vTaskDelay(pdMS_TO_TICKS(30));
        }
    }
    if (!confirmou) {
        /* A A não confirmou: ela não está neste canal ou está com o firmware oficial. */
        saida("WS_CANAL,%d,erro_a_nao_respondeu\n", s_canal);
        s_estado = ESTADO_OK;
        return;
    }
    vTaskDelay(pdMS_TO_TICKS(40));
    if (ws_radio_canal(novo) == ESP_OK) {
        s_canal = novo;
        ws_canal_salvar(novo);
        s_tem_seq = false;
        saida("WS_CANAL,%d,ok\n", s_canal);
    } else {
        saida("WS_CANAL,%d,erro_radio\n", s_canal);
    }
    s_ultima_rx_ms = agora_ms();
    s_estado = ESTADO_OK;
}

static bool ouviu_em(uint8_t canal)
{
    uint32_t antes = s_recebidos;
    ir_para(canal);
    vTaskDelay(pdMS_TO_TICKS(ESPERA_CANAL_PROCURA_MS));
    return s_recebidos != antes;
}

static void procurar_a(void)
{
    s_estado = ESTADO_PROCURANDO;
    saida("WS_INFO,a Placa A sumiu: procurando em todos os canais\n");
    int achou = -1;
    for (int ch = WS_CANAL_MIN; ch <= WS_CANAL_MAX && achou < 0; ch++) {
        if (ch != s_canal && ouviu_em(ch)) {
            achou = ch;
        }
    }
    if (achou < 0 && ouviu_em(s_canal)) {
        achou = s_canal;
    }
    if (achou >= 0) {
        s_canal = achou;
        ws_canal_salvar(achou);
        saida("WS_CANAL,%d,achou\n", achou);
    } else {
        ir_para(s_canal);
        saida("WS_INFO,a Placa A nao respondeu em nenhum canal (ligada? firmware v2?)\n");
    }
    s_ultima_rx_ms = agora_ms();
    s_estado = ESTADO_OK;
}

static void estado_info(void)
{
    saida("WS_INFO,v%d,placa=B,canal=%d,banda=20MHz,modo=%s,mac=" MACSTR "\n",
          WS_VERSAO, s_canal, WS_UNICAST ? "unicast" : "broadcast", MAC2STR(MAC_B));
}

static void tarefa_controle(void *arg)
{
    pedido_t p;
    for (;;) {
        if (xQueueReceive(s_fila_pedidos, &p, pdMS_TO_TICKS(250)) == pdTRUE) {
            switch (p.tipo) {
            case PEDIDO_CANAL: trocar_canal(p.canal); break;
            case PEDIDO_VARRER: varrer(); break;
            case PEDIDO_ESTADO: estado_info(); break;
            }
            continue;
        }
        uint32_t silencio_ms = agora_ms() - s_ultima_rx_ms;
        if (silencio_ms > SILENCIO_PROCURA_MS) {
            procurar_a();
        }
    }
}

/* ---------- Comandos pela USB ---------- */

static void tratar_comando(char *s)
{
    while (*s == ' ') {
        s++;
    }
    pedido_t p = {0};
    int canal = 0;
    if (sscanf(s, "canal %d", &canal) == 1) {
        p.tipo = PEDIDO_CANAL;
        p.canal = (uint8_t)(canal > 0 && canal < 256 ? canal : 0);
    } else if (strncmp(s, "varrer", 6) == 0) {
        p.tipo = PEDIDO_VARRER;
    } else if (strncmp(s, "estado", 6) == 0) {
        p.tipo = PEDIDO_ESTADO;
    } else {
        if (*s) {
            saida("WS_INFO,comando desconhecido (use: canal N | varrer | estado)\n");
        }
        return;
    }
    if (xQueueSend(s_fila_pedidos, &p, 0) != pdTRUE) {
        saida("WS_INFO,ocupada, tente de novo\n");
    }
}

static void tarefa_comandos(void *arg)
{
    char linha[48];
    int n = 0;
    uint8_t c;
    for (;;) {
        if (uart_read_bytes(UART_CONSOLE, &c, 1, portMAX_DELAY) != 1) {
            continue;
        }
        if (c == '\n' || c == '\r') {
            linha[n] = 0;
            if (n) {
                tratar_comando(linha);
            }
            n = 0;
        } else if (n < (int)sizeof(linha) - 1) {
            linha[n++] = (char)c;
        }
    }
}

/* ---------- Estado por segundo ---------- */

static const char *nome_estado(estado_t e)
{
    switch (e) {
    case ESTADO_PROCURANDO: return "procurando";
    case ESTADO_VARRENDO: return "varrendo";
    case ESTADO_TROCANDO: return "trocando";
    default: return "ok";
    }
}

static void tarefa_estado(void *arg)
{
    uint32_t tique = 0, rec_antes = 0, rep_antes = 0, cheia_antes = 0;
    uint32_t seq_antes = 0, semr_antes = 0, naos_antes = 0;
    int32_t rssi_antes = 0, ruido_antes = 0;
    bool tem_antes = false;
    float fracao = 0;
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(100));
        tique++;
        if (tique % 10 == 0) {
            uint32_t rec = s_recebidos, rep = s_repetidos, cheia = s_fila_cheia;
            int32_t srssi = s_soma_rssi, sruido = s_soma_ruido;
            uint32_t seq = s_ultimo_seq, semr = s_a_sem_resposta, naos = s_a_nao_saiu;
            uint32_t drec = rec - rec_antes;
            char tentou[12] = "-", semresp[12] = "-", naosaiu[12] = "-", rssi[8] = "-", ruido[8] = "-";
            if (drec) {
                snprintf(rssi, sizeof(rssi), "%ld", (long)((srssi - rssi_antes) / (int32_t)drec));
                snprintf(ruido, sizeof(ruido), "%ld", (long)((sruido - ruido_antes) / (int32_t)drec));
                if (tem_antes && s_tem_seq) {
                    /* Se a A reiniciou, o número volta para perto de zero. */
                    uint32_t dt = seq >= seq_antes ? seq - seq_antes : seq + 1;
                    snprintf(tentou, sizeof(tentou), "%lu", (unsigned long)dt);
                    fracao = dt ? (float)drec / (float)dt : 1.0f;
                } else {
                    fracao = 1.0f;
                }
                if (s_tem_sonda && tem_antes) {
                    snprintf(semresp, sizeof(semresp), "%lu", (unsigned long)(semr >= semr_antes ? semr - semr_antes : semr));
                    snprintf(naosaiu, sizeof(naosaiu), "%lu", (unsigned long)(naos >= naos_antes ? naos - naos_antes : naos));
                }
            } else {
                fracao = 0;
            }
            /* WS_STAT,tempo_ms,canal,recebidos,repetidos,fila_cheia,a_tentou,a_sem_resposta,
             *         a_nao_saiu,rssi,ruido,estado,a_freq */
            saida("WS_STAT,%lu,%d,%lu,%lu,%lu,%s,%s,%s,%s,%s,%s,%lu\n",
                  (unsigned long)agora_ms(), s_canal,
                  (unsigned long)drec, (unsigned long)(rep - rep_antes), (unsigned long)(cheia - cheia_antes),
                  tentou, semresp, naosaiu, rssi, ruido, nome_estado(s_estado), (unsigned long)s_a_freq);
            rec_antes = rec;
            rep_antes = rep;
            cheia_antes = cheia;
            rssi_antes = srssi;
            ruido_antes = sruido;
            if (drec) {
                seq_antes = seq;
                semr_antes = semr;
                naos_antes = naos;
                tem_antes = s_tem_seq;
            }
        }
        ws_led_padrao(fracao, tique);
    }
}

void app_main(void)
{
    ws_nvs_iniciar();
    ws_led_iniciar();

    /* Driver da UART do console: escrita com fila (não trava quem escreve) e leitura de comandos. */
    ESP_ERROR_CHECK(uart_driver_install(UART_CONSOLE, 1024, 32 * 1024, 0, NULL, 0));
    uart_vfs_dev_use_driver(UART_CONSOLE);

    s_fila_csi = xQueueCreate(FILA_CSI, sizeof(medida_t));
    s_fila_pedidos = xQueueCreate(4, sizeof(pedido_t));
    s_enviado = xSemaphoreCreateBinary();

    s_canal = ws_canal_lido();
    ws_radio_iniciar(MAC_B, s_canal);
    s_canal = ws_radio_canal_atual();
    ESP_ERROR_CHECK(esp_now_register_send_cb(ao_enviar));
    ws_par_adicionar(MAC_A);   /* para mandar o pedido de troca de canal */

    wifi_csi_config_t csi = {
        .lltf_en = true,
        .htltf_en = false,
        .stbc_htltf2_en = false,
        .ltf_merge_en = false,
        .channel_filter_en = true,   /* igual ao oficial, para comparar com as coletas antigas */
        .manu_scale = false,
        .shift = 0,
        .dump_ack_en = false,
    };
    ESP_ERROR_CHECK(esp_wifi_set_csi_config(&csi));
    ESP_ERROR_CHECK(esp_wifi_set_csi_rx_cb(ao_receber_csi, NULL));
    ESP_ERROR_CHECK(esp_wifi_set_csi(true));
    esp_wifi_set_promiscuous(false);

    ESP_LOGI(TAG, "================ CSI RECV ================");
    esp_log_level_set("wifi", ESP_LOG_WARN);
    esp_log_level_set("ws_radio", ESP_LOG_WARN);
    saida("type,id,mac,rssi,rate,sig_mode,mcs,bandwidth,smoothing,not_sounding,aggregation,stbc,fec_coding,sgi,noise_floor,ampdu_cnt,channel,secondary_channel,local_timestamp,ant,sig_len,rx_state,len,first_word,data\n");
    estado_info();

    s_ultima_rx_ms = agora_ms();
    /* No ESP32 o Wi-Fi roda no núcleo 0; a escrita na USB fica no núcleo 1. */
    xTaskCreatePinnedToCore(tarefa_saida, "saida", 4096, NULL, 4, NULL, portNUM_PROCESSORS - 1);
    xTaskCreate(tarefa_estado, "estado", 3072, NULL, 5, NULL);
    xTaskCreate(tarefa_comandos, "comandos", 3072, NULL, 3, NULL);
    xTaskCreate(tarefa_controle, "controle", 4096, NULL, 6, NULL);
}
