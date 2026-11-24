/* Partes iguais nas duas placas: memória do canal, rádio, ESP-NOW e LED. */
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "esp_now.h"

void ws_nvs_iniciar(void);
uint8_t ws_canal_lido(void);          /* último canal salvo, ou WS_CANAL_PADRAO */
void ws_canal_salvar(uint8_t canal);
bool ws_canal_valido(int canal);

/* Liga o Wi-Fi em modo estação com o endereço `mac`, 20 MHz, potência máxima, país BR,
 * no `canal`, e inicia o ESP-NOW. */
void ws_radio_iniciar(const uint8_t mac[6], uint8_t canal);
esp_err_t ws_radio_canal(uint8_t canal);
uint8_t ws_radio_canal_atual(void);

/* Cadastra `mac` como par do ESP-NOW no canal atual, com a taxa mais robusta (MCS0, 20 MHz). */
void ws_par_adicionar(const uint8_t mac[6]);

void ws_led_iniciar(void);
void ws_led(bool aceso);

/* Padrão do LED a partir da fração de sondas que chegaram no último segundo (0 a 1, ou < 0 se
 * não há como saber). Chamar a cada 100 ms com o número do tique. */
void ws_led_padrao(float fracao, uint32_t tique);
