<template>
  hello, home page.
  <div class="bt">
    <button @click="load1">load img1</button>
    <button @click="load2">load img2</button>
  </div>
  <div class="img">
    <img :src="myImg" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      myImg: "",
    }
  },
  methods: {
    load1() {
      this.loadImg("1.jpeg")
    },
    load2() {
      this.loadImg("2.jpeg")
    },
    async loadImg(name: string) {
      const rs = await this.$axios.get(`/web/static/${name}`, {
        responseType: 'arraybuffer'
      });
      if(rs.status !== 200) {
        console.warn(rs);
        return;
      }
      const d = rs.data;
      const link = URL.createObjectURL(new Blob([d], {type: 'image/jpeg'}));
      this.myImg = link;
    }
  }
})
</script>
