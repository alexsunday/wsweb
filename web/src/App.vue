<template>
  <header>
    <nav>
      <RouterLink class="nav-item" to="/">Home</RouterLink>
      <RouterLink class="nav-item" to="/about">About</RouterLink>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({

})
</script>

<style scoped>
nav > :not(:first-child) {
  margin-left: 10px;
}

nav {
  text-align: center;
  margin-top: 2rem;
}

nav > .router-link-exact-active {
  color: var(--color-text);
}

nav > .router-link-exact-active:hover {
  background-color: transparent;
}

nav .nav-item {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}


</style>
