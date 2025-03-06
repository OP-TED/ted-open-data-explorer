<script setup>
import {
  lightTheme,
  NConfigProvider,
  NMessageProvider,
} from 'naive-ui'

import Navigator from './Navigator.vue'

</script>

<template>
  <n-message-provider>
    <n-config-provider :theme="lightTheme">
      <Navigator/>
    </n-config-provider>
  </n-message-provider>
</template>
