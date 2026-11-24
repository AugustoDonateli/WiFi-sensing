/* Wave Sense, Placa A (transmissor), firmware versão 2.
 *
 * Manda WS_FREQ_HZ sondas por segundo para a Placa B. Diferenças para o csi_send oficial:
 *  - 20 MHz em vez de 40 e potência máxima;
 *  - unicast: o rádio repete a sonda quando a B não confirma (o broadcast oficial manda uma vez só);
 *  - a sonda leva contadores (quantas não saíram, quantas a B não confirmou), que a B repassa
 *    para a tela: dá para saber onde os pacotes se perdem;
 *  - a B pode mandar a A trocar de canal (sem regravar nada);
 *  - LED: aceso = a B está ouvindo; pisca devagar = perdendo muito; pisca rápido = a B não ouve.
 */
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "ws_protocolo.h"
#include "ws_radio.h"

static const char *TAG = "placa_A";
static const uint8_t MAC_A[6] = WS_MAC_A;
static const uint8_t MAC_B[6] = WS_MAC_B;
#if WS_UNICAST
static const uint8_t *DESTINO = MAC_B;
#else
static const uint8_t DESTINO_BC[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
static const uint8_t *DESTINO = DESTINO_BC;
#endif

static SemaphoreHandle_t s_enviado;
static QueueHandle_t s_pedidos_canal;
static volatile uint32_t s_sem_resposta, s_nao_saiu, s_confirmadas, s_tentativas;

static void ao_enviar(const esp_now_send_info_t *info, esp_now_send_status_t status)
{
    if (status == ESP_NOW_SEND_SUCCESS) {
        s_confirmadas++;
    } else {
        s_sem_resposta++;
    }
    xSemaphoreGive(s_enviado);
}

static void ao_receber(const esp_now_recv_info_t *info, const uint8_t *dados, int tam)
{
    if (!info || memcmp(info->src_addr, MAC_B, 6) != 0 || tam < (int)sizeof(ws_comando_t)) {
        return;
    }
    ws_comando_t cmd;
    memcpy(&cmd, dados, sizeof(cmd));
    if (cmd.magico == WS_MAGICO_COMANDO && cmd.tipo == WS_CMD_CANAL && ws_canal_valido(cmd.canal)) {
        /* Aqui é a tarefa do Wi-Fi: a troca de canal fica para o laço principal. */
        xQueueSend(s_pedidos_canal, &cmd.canal, 0);
    }
}

static void tarefa_led(void *arg)
{
    uint32_t tique = 0, enviadas_antes = 0, confirmadas_antes = 0;
    float fracao = -1;
    for (;;) {
        if (tique % 10 == 0) {
            uint32_t enviadas = s_tentativas, confirmadas = s_confirmadas;
            uint32_t de = enviadas - enviadas_antes, dc = confirmadas - confirmadas_antes;
            enviadas_antes = enviadas;
            confirmadas_antes = confirmadas;
#if WS_UNICAST
            fracao = de ? (float)dc / (float)de : 0.0f;
#else
            fracao = -1;
            (void)dc;
#endif
        }
        ws_led_padrao(fracao, tique++);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void app_main(void)
{
    ws_nvs_iniciar();
    ws_led_iniciar();
    s_enviado = xSemaphoreCreateBinary();
    s_pedidos_canal = xQueueCreate(4, sizeof(uint8_t));

    uint8_t canal = ws_canal_lido();
    ws_radio_iniciar(MAC_A, canal);
    canal = ws_radio_canal_atual();
    ESP_ERROR_CHECK(esp_now_register_send_cb(ao_enviar));
    ESP_ERROR_CHECK(esp_now_register_recv_cb(ao_receber));
    ws_par_adicionar(DESTINO);

    ESP_LOGI(TAG, "================ WAVE SENSE: PLACA A ================");
    ESP_LOGI(TAG, "firmware v%d, canal %d (20 MHz), %d sondas/s, %s, mac " MACSTR,
             WS_VERSAO, canal, WS_FREQ_HZ, WS_UNICAST ? "unicast para a B" : "broadcast", MAC2STR(MAC_A));

    xTaskCreate(tarefa_led, "led", 2048, NULL, 2, NULL);

    const TickType_t periodo = pdMS_TO_TICKS(1000 / WS_FREQ_HZ);
    TickType_t ultimo = xTaskGetTickCount();
    ws_sonda_t sonda = {
        .magico = WS_MAGICO_SONDA,
        .versao = WS_VERSAO,
        .freq_hz = WS_FREQ_HZ,
    };

    for (uint32_t seq = 0;; ++seq) {
        uint8_t novo;
        if (xQueueReceive(s_pedidos_canal, &novo, 0) == pdTRUE && novo != canal) {
            vTaskDelay(pdMS_TO_TICKS(20));   /* deixa o ACK do pedido sair antes de trocar */
            if (ws_radio_canal(novo) == ESP_OK) {
                canal = novo;
                ws_canal_salvar(canal);
                ESP_LOGI(TAG, "a Placa B pediu o canal %d: trocado", canal);
            }
            ultimo = xTaskGetTickCount();
        }

        sonda.seq = seq;
        sonda.sem_resposta = s_sem_resposta;
        sonda.nao_saiu = s_nao_saiu;
        sonda.canal = canal;
        s_tentativas = seq + 1;
        xSemaphoreTake(s_enviado, 0);   /* zera um aviso antigo */
        esp_err_t ret = esp_now_send(DESTINO, (const uint8_t *)&sonda, sizeof(sonda));
        if (ret == ESP_OK) {
            /* Espera o rádio terminar (com as repetições) antes da próxima, no máximo meio período. */
            xSemaphoreTake(s_enviado, periodo / 2 ? periodo / 2 : 1);
        } else {
            s_nao_saiu++;
        }
        vTaskDelayUntil(&ultimo, periodo);
    }
}
