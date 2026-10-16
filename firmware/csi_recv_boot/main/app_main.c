/*
 * SPDX-License-Identifier: Apache-2.0
 * Wi-Fi configuration based on Espressif ESP-CSI csi_recv,
 * commit 8633d67152db2808f141cc1595970aa9cf406045 (2025-2026 Espressif).
 * Wave Sense: ESP32-only experimental capture with BOOT/GPIO0 timestamps.
 * No printing or waiting in Wi-Fi/GPIO callbacks. Only writer_task owns stdout.
 */
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_app_desc.h"
#include "esp_random.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_mac.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "nvs_flash.h"

#if !CONFIG_IDF_TARGET_ESP32
#error "This capture format is supported only on the classic ESP32."
#endif
#define BASE_COMMIT "8633d67152db2808f141cc1595970aa9cf406045"
#define BOOT_GPIO GPIO_NUM_0
#define MAX_CSI 384
static const uint8_t sender_mac[] = {0x1a, 0, 0, 0, 0, 0};
static QueueHandle_t packets, buttons;
static volatile uint32_t csi_drops, button_drops, invalid_packets;
static uint64_t boot_id;

typedef struct {
    uint32_t id;
    int64_t device_us;
    wifi_pkt_rx_ctrl_t rx;
    uint8_t mac[6];
    uint16_t len;
    bool first_word;
    int8_t data[MAX_CSI];
} packet_t;
typedef struct { uint32_t seq; int64_t device_us; int level; } button_t;

static void boot_edge(void *arg)
{
    (void)arg;
    static int64_t last_us = -30000;
    static uint32_t seq;
    const int64_t now = esp_timer_get_time();
    /* Keep the first edge, suppress contact bounce for 30 ms. Pilot presses
       must last >= 0.5 s, with >= 1 s between presses. */
    if (now - last_us < 30000) return;
    last_us = now;
    const button_t event = {++seq, now, gpio_get_level(BOOT_GPIO)};
    BaseType_t wake = pdFALSE;
    if (xQueueSendFromISR(buttons, &event, &wake) != pdTRUE) button_drops++;
    if (wake) portYIELD_FROM_ISR();
}

static void csi_rx(void *ctx, wifi_csi_info_t *info)
{
    (void)ctx;
    const int64_t entry_us = esp_timer_get_time();
    if (!info || memcmp(info->mac, sender_mac, 6)) return;
    if (!info->buf || !info->payload || info->payload_len < 19 || info->len != MAX_CSI) {
        invalid_packets++;
        return;
    }
    packet_t packet = {.device_us = entry_us, .rx = info->rx_ctrl,
                       .len = info->len, .first_word = info->first_word_invalid};
    /* memcpy avoids the unaligned uint32 dereference in the upstream example. */
    memcpy(&packet.id, info->payload + 15, sizeof(packet.id));
    memcpy(packet.mac, info->mac, sizeof(packet.mac));
    memcpy(packet.data, info->buf, packet.len);
    if (xQueueSend(packets, &packet, 0) != pdTRUE) csi_drops++;
}

static void print_info(void)
{
    const esp_app_desc_t *app = esp_app_get_description();
    char sha[65];
    for (int i = 0; i < 32; i++) snprintf(sha + 2*i, 3, "%02x", app->app_elf_sha256[i]);
    printf("POSE_INFO,1,boot0,esp32,%s,%s,%s,%016"PRIx64"\n", app->idf_ver, BASE_COMMIT, sha, boot_id);
}

static void print_packet(const packet_t *p)
{
    const wifi_pkt_rx_ctrl_t *r = &p->rx;
    /* Same 25-column CSI_DATA layout as the official ESP32 example. The
       radio timestamp remains unchanged; the additional line gives the
       callback-entry clock shared with BOOT. Do not equate the two clocks. */
    printf("CSI_DATA,%"PRIu32","MACSTR",%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%d,%u,%u,%u,%"PRIu32",%u,%u,%u,%u,%u,\"[",
        p->id, MAC2STR(p->mac), r->rssi, r->rate, r->sig_mode, r->mcs, r->cwb,
        r->smoothing, r->not_sounding, r->aggregation, r->stbc, r->fec_coding, r->sgi,
        r->noise_floor, r->ampdu_cnt, r->channel, r->secondary_channel,
        (uint32_t)r->timestamp, r->ant, r->sig_len, r->sig_mode, p->len, p->first_word);
    for (int i = 0; i < p->len; i++) printf(i ? ",%d" : "%d", p->data[i]);
    printf("]\"\n");
    printf("POSE_CLOCK,1,%"PRIu32",%"PRIu32",%"PRId64",%"PRIu32",%"PRIu32"\n",
           p->id, (uint32_t)r->timestamp, p->device_us, csi_drops, button_drops);
}

static void writer_task(void *arg)
{
    (void)arg;
    packet_t packet;
    button_t button;
    int64_t last_status = -1000000;
    print_info(); /* identify this boot before any queued packet is emitted */
    for (;;) {
        while (xQueueReceive(buttons, &button, 0) == pdTRUE) {
            printf("POSE_BOOT,1,%"PRIu32",%"PRId64",%d,%"PRIu32"\n",
                   button.seq, button.device_us, button.level, button_drops);
        }
        if (xQueueReceive(packets, &packet, pdMS_TO_TICKS(10)) == pdTRUE) print_packet(&packet);
        const int64_t now = esp_timer_get_time();
        if (now - last_status >= 1000000) {
            print_info();
            printf("POSE_STATUS,1,%"PRId64",%"PRIu32",%"PRIu32",%"PRIu32"\n",
                   now, csi_drops, button_drops, invalid_packets);
            last_status = now;
        }
    }
}

static void wifi_init(void)
{
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    ESP_ERROR_CHECK(esp_netif_init());
    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
    ESP_ERROR_CHECK(esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT40));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));
    ESP_ERROR_CHECK(esp_wifi_set_channel(11, WIFI_SECOND_CHAN_BELOW));
    ESP_ERROR_CHECK(esp_wifi_set_mac(WIFI_IF_STA, sender_mac));
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_set_pmk((uint8_t *)"pmk1234567890123"));
    esp_now_peer_info_t peer = {.channel = 11, .ifidx = WIFI_IF_STA, .encrypt = false,
                              .peer_addr = {0xff,0xff,0xff,0xff,0xff,0xff}};
    ESP_ERROR_CHECK(esp_now_add_peer(&peer));
    esp_now_rate_config_t rate = {.phymode = WIFI_PHY_MODE_HT40, .rate = WIFI_PHY_RATE_MCS0_LGI};
    ESP_ERROR_CHECK(esp_now_set_peer_rate_config(peer.peer_addr, &rate));
    ESP_ERROR_CHECK(esp_wifi_set_promiscuous(true));
    wifi_csi_config_t config = {.lltf_en = true, .htltf_en = true, .stbc_htltf2_en = true,
                              .ltf_merge_en = true, .channel_filter_en = true};
    ESP_ERROR_CHECK(esp_wifi_set_csi_config(&config));
    ESP_ERROR_CHECK(esp_wifi_set_csi_rx_cb(csi_rx, NULL));
    ESP_ERROR_CHECK(esp_wifi_set_csi(true));
}

void app_main(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    packets = xQueueCreate(32, sizeof(packet_t));
    buttons = xQueueCreate(32, sizeof(button_t));
    ESP_ERROR_CHECK(packets && buttons ? ESP_OK : ESP_ERR_NO_MEM);
    gpio_config_t button_config = {.pin_bit_mask = 1ULL << BOOT_GPIO,
        .mode = GPIO_MODE_INPUT, .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE, .intr_type = GPIO_INTR_ANYEDGE};
    ESP_ERROR_CHECK(gpio_config(&button_config));
    /* No ESP_INTR_FLAG_IRAM: ISR and its callees may execute from flash. */
    ESP_ERROR_CHECK(gpio_install_isr_service(0));
    ESP_ERROR_CHECK(gpio_isr_handler_add(BOOT_GPIO, boot_edge, NULL));
    wifi_init();
    /* RF is active: use the hardware random source to distinguish restarts. */
    boot_id = ((uint64_t)esp_random()<<32) | esp_random();
    ESP_ERROR_CHECK(xTaskCreate(writer_task, "pose_writer", 8192, NULL, 5, NULL) == pdPASS ? ESP_OK : ESP_ERR_NO_MEM);
}
