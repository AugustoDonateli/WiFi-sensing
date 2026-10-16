idf_component_register(SRCS "app_main.c"
    INCLUDE_DIRS "."
    REQUIRES nvs_flash esp_wifi esp_netif esp_event esp_timer esp_driver_gpio esp_app_format)
