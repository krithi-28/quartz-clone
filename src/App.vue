<template>
  <a-config-provider>
    <router-view></router-view>
  </a-config-provider>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "App",
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
</style>
