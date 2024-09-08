<template>
  <div class="about">
    <h1>This is an about page</h1>
    <p>发送一个 ajax 请求?</p>
    <p>试试 window.axios ?</p>
    <div class="test">
      <div class="ur">
        <input class="req-url" type="text" v-model="reqUrl" placeholder="input url here" />
        <button @click="doRequest">Go</button>
      </div>
      <div class="result">
        <textarea readonly="true" v-model="result" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      reqUrl: "",
      result: "",
    }
  },
  methods: {
    async doRequest() {
      let rs = "";
      const decoder = new TextDecoder();
      const result = await this.$axios.get(this.reqUrl, {
        responseType: 'arraybuffer'
      });
      rs += `${result.status} ${result.statusText} \r\n\r\n`;
      rs += decoder.decode(result.data);
      this.result = rs;
    }
  }
});
</script>

<style scoped>
input.req-url {
  width: 400px;
  margin-right: 5px;
}

textarea {
  width: 400px;
  height: 300px;
  margin-top: 10px;
}
</style>
