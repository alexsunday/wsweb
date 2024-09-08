import { AxiosInstance } from 'axios';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}

export {}
