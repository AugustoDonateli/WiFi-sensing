/* Wave Sense: o que a Placa A e a Placa B combinam entre si.
 *
 * As duas placas precisam do mesmo firmware desta pasta (versão 2). A Placa A manda "sondas"
 * (pacotes ESP-NOW) para a Placa B; a B mede o CSI de cada uma e manda pela USB.
 */
#pragma once

#include <stdint.h>

#define WS_VERSAO 2

/* Endereços fixos. O da A é o mesmo do exemplo oficial (1a:00:00:00:00:00), para o filtro
 * continuar igual. O da B precisa ser outro, porque a A agora manda direto para ela (unicast). */
#define WS_MAC_A {0x1a, 0x00, 0x00, 0x00, 0x00, 0x00}
#define WS_MAC_B {0x1a, 0x00, 0x00, 0x00, 0x00, 0x01}

/* Canal usado na primeira vez. Depois, cada placa guarda o último canal na memória (NVS). */
#define WS_CANAL_PADRAO 11
#define WS_CANAL_MIN 1
#define WS_CANAL_MAX 13   /* no Brasil a Anatel permite de 1 a 13 */

/* Sondas por segundo da Placa A. Com só o bloco LLTF na linha, a USB a 921600 aguenta ~140 por
 * segundo, e a impressão não atrapalha mais a recepção. Mais sondas = mais folga quando o canal
 * estiver cheio. */
#define WS_FREQ_HZ 100

/* 1 = a A manda direto para a B e o rádio repete a sonda se a B não confirmar (ACK).
 * 0 = broadcast, como o exemplo oficial: cada sonda sai uma vez só. */
#define WS_UNICAST 1

#define WS_MAGICO_SONDA 0x31535357u    /* "WSS1" */
#define WS_MAGICO_COMANDO 0x31435357u  /* "WSC1" */

/* Corpo da sonda. O seq vem primeiro: o csi_recv oficial lê um número de 4 bytes nessa posição,
 * então ele continua mostrando o número certo se alguém usar o receptor antigo. */
typedef struct __attribute__((packed)) {
    uint32_t seq;           /* conta todas as tentativas da A, uma por período */
    uint32_t magico;        /* WS_MAGICO_SONDA */
    uint32_t sem_resposta;  /* sondas que saíram da A e a B não confirmou (só no unicast) */
    uint32_t nao_saiu;      /* sondas que nem saíram da A (fila do rádio cheia, canal ocupado) */
    uint8_t canal;
    uint8_t versao;
    uint16_t freq_hz;
} ws_sonda_t;

enum { WS_CMD_CANAL = 1 };

typedef struct __attribute__((packed)) {
    uint32_t magico;  /* WS_MAGICO_COMANDO */
    uint8_t tipo;     /* WS_CMD_CANAL */
    uint8_t canal;
    uint16_t reservado;
} ws_comando_t;

/* No quadro ESP-NOW, o corpo enviado começa 15 bytes depois do início do payload
 * (categoria, OUI, aleatório, elemento, tamanho, OUI, tipo, versão). */
#define WS_DESLOCAMENTO_CORPO 15

/* LED azul da maioria das DevKit de ESP32 (GPIO2). -1 desliga. */
#if CONFIG_IDF_TARGET_ESP32
#define WS_LED_GPIO 2
#else
#define WS_LED_GPIO -1
#endif
