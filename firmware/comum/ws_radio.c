#include "ws_radio.h"

#include <string.h>
#include "driver/gpio.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "ws_protocolo.h"

static const char *TAG = "ws_radio";

void ws_nvs_iniciar(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
}

bool ws_canal_valido(int canal)
{
    return canal >= WS_CANAL_MIN && canal <= WS_CANAL_MAX;
}

uint8_t ws_canal_lido(void)
{
    nvs_handle_t h;
    uint8_t canal = WS_CANAL_PADRAO;
    if (nvs_open("wavesense", NVS_READONLY, &h) == ESP_OK) {
        uint8_t v = 0;
        if (nvs_get_u8(h, "canal", &v) == ESP_OK && ws_canal_valido(v)) {
            canal = v;
        }
        nvs_close(h);
    }
    return canal;
}

void ws_canal_salvar(uint8_t canal)
{
    nvs_handle_t h;
    if (nvs_open("wavesense", NVS_READWRITE, &h) == ESP_OK) {
        uint8_t antigo = 0;
        if (nvs_get_u8(h, "canal", &antigo) != ESP_OK || antigo != canal) {
            nvs_set_u8(h, "canal", canal);
            nvs_commit(h);
        }
        nvs_close(h);
    }
}

static uint8_t s_canal_atual;

esp_err_t ws_radio_canal(uint8_t canal)
{
    if (!ws_canal_valido(canal)) {
        return ESP_ERR_INVALID_ARG;
    }
    esp_err_t ret = esp_wifi_set_channel(canal, WIFI_SECOND_CHAN_NONE);
    if (ret == ESP_OK) {
        s_canal_atual = canal;
    } else {
        ESP_LOGW(TAG, "não consegui ir para o canal %d: %s", canal, esp_err_to_name(ret));
    }
    return ret;
}

uint8_t ws_radio_canal_atual(void)
{
    return s_canal_atual;
}

void ws_radio_iniciar(const uint8_t mac[6], uint8_t canal)
{
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    ESP_ERROR_CHECK(esp_netif_init());
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    /* O endereço só pode mudar com a interface desligada, antes do start. */
    ESP_ERROR_CHECK(esp_wifi_set_mac(WIFI_IF_STA, mac));
    /* 20 MHz em vez de 40: ocupa um canal só (menos redes da feira por cima), a mesma potência fica
     * concentrada na metade da faixa (+3 dB por subportadora) e o bloco LLTF, que é o que o detector
     * usa, é o mesmo. */
    ESP_ERROR_CHECK(esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N));
    ESP_ERROR_CHECK(esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT20));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));

    /* Brasil: canais 1 a 13. O padrão do ESP-IDF ("01") deixa o 12 e o 13 só para escuta. */
    esp_err_t ret = esp_wifi_set_country_code("BR", false);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "país BR não aceito (%s); canais 12 e 13 podem falhar", esp_err_to_name(ret));
    }
    /* Potência máxima permitida pelo chip (84 = 21 dBm pedidos; o ESP32 entrega 20 dBm). */
    ret = esp_wifi_set_max_tx_power(84);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "potência: %s", esp_err_to_name(ret));
    }

    if (ws_radio_canal(canal) != ESP_OK && canal != WS_CANAL_PADRAO) {
        ESP_ERROR_CHECK(ws_radio_canal(WS_CANAL_PADRAO));
    }

    ESP_ERROR_CHECK(esp_now_init());
}

void ws_par_adicionar(const uint8_t mac[6])
{
    esp_now_peer_info_t par = {
        .channel = 0,              /* 0 = o canal em que a placa estiver, mesmo depois de trocar */
        .ifidx = WIFI_IF_STA,
        .encrypt = false,
    };
    memcpy(par.peer_addr, mac, 6);
    ESP_ERROR_CHECK(esp_now_add_peer(&par));
    /* MCS0 (BPSK 1/2) é o modo mais robusto que ainda tem o bloco LLTF que o CSI mede. */
    esp_now_rate_config_t taxa = {
        .phymode = WIFI_PHY_MODE_HT20,
        .rate = WIFI_PHY_RATE_MCS0_LGI,
        .ersu = false,
        .dcm = false,
    };
    ESP_ERROR_CHECK(esp_now_set_peer_rate_config(par.peer_addr, &taxa));
}

void ws_led_iniciar(void)
{
#if WS_LED_GPIO >= 0
    gpio_reset_pin(WS_LED_GPIO);
    gpio_set_direction(WS_LED_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(WS_LED_GPIO, 0);
#endif
}

void ws_led(bool aceso)
{
#if WS_LED_GPIO >= 0
    gpio_set_level(WS_LED_GPIO, aceso ? 1 : 0);
#else
    (void)aceso;
#endif
}

void ws_led_padrao(float fracao, uint32_t tique)
{
    if (fracao < 0) {
        ws_led(tique % 10 == 0);           /* sem como saber: um piscar curto por segundo */
    } else if (fracao >= 0.8f) {
        ws_led(true);                      /* aceso: chegando bem */
    } else if (fracao >= 0.2f) {
        ws_led(tique % 10 < 5);            /* pisca devagar: perdendo muitos pacotes */
    } else {
        ws_led(tique % 2 == 0);            /* pisca rápido: quase nada chega */
    }
}
