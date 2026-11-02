<!--
  封面图上传（受控组件，v-model 绑定图片 URL 字符串）

  【待接入的后端接口】
    POST /api/file/upload   multipart/form-data, 字段名 file
      → { code:200, message:'ok', data:{ url:'http://localhost:8080/uploads/2026/10/xxx.jpg' } }
      request.js 会剥掉外层，组件拿到的就是 { url }

  用法：
    <CoverUpload v-model="form.cover" />              演示模式，只做本地预览
    <CoverUpload v-model="form.cover" remote />       接真实上传接口
-->
<template>
  <div class="cover-upload">
    <div
      class="box"
      :class="{ 'is-empty': !modelValue, 'is-disabled': disabled }"
      @click="pick"
    >
      <template v-if="modelValue">
        <img :src="modelValue" alt="封面" />
        <div v-if="!disabled" class="mask">
          <span class="mask-btn">替换</span>
          <span class="mask-btn danger" @click.stop="remove">删除</span>
        </div>
      </template>
      <template v-else>
        <el-icon class="plus" :size="20"><Plus /></el-icon>
        <span class="tip">上传封面</span>
      </template>

      <div v-if="loading" class="loading">
        <el-icon class="spin" :size="18"><Loading /></el-icon>
      </div>
    </div>

    <input
      ref="inputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="onFileChange"
    />

    <p class="hint">
      建议 16:9，JPG / PNG / WebP，不超过 {{ maxSize }}MB　·　{{ modeText }}
    </p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
// 函数式组件不会被 unplugin 注入样式，这行不能删
import 'element-plus/es/components/message/style/css'
import { Loading, Plus } from '@element-plus/icons-vue'
import { uploadImage } from '../api/upload'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  maxSize: { type: Number, default: 2 },
  // false: 本地 objectURL 预览（后端未就绪）；true: 走真实上传接口拿 URL
  remote: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'change'])

const inputRef = ref(null)
const loading = ref(false)
// 记录本次生成的 blob 地址，替换/删除/卸载时要释放，否则内存泄漏
const blobUrl = ref('')

const modeText = computed(() =>
  props.remote ? '保存服务器返回的完整地址' : '演示模式，仅本地预览'
)

function pick() {
  if (props.disabled || loading.value) return
  inputRef.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 清空才能重复选同一个文件，否则第二次不触发 change
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return ElMessage.warning('只能上传 JPG / PNG / WebP 格式')
  }
  if (file.size > props.maxSize * 1024 * 1024) {
    return ElMessage.warning(`图片不能超过 ${props.maxSize}MB`)
  }

  loading.value = true
  try {
    let url
    if (props.remote) {
      const res = await uploadImage(file) // 错误提示由 request.js 拦截器统一弹
      url = res.url
      if (!url) throw new Error('接口未返回 url')
    } else {
      releaseBlob()
      url = URL.createObjectURL(file)
      blobUrl.value = url
    }
    emit('update:modelValue', url)
    emit('change', url)
  } catch (err) {
    if (err?.message === '接口未返回 url') ElMessage.error('上传失败：接口未返回图片地址')
  } finally {
    loading.value = false
  }
}

function releaseBlob() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = ''
  }
}

function remove() {
  releaseBlob()
  emit('update:modelValue', '')
  emit('change', '')
}

onBeforeUnmount(releaseBlob)
</script>

<style scoped>
.cover-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.box {
  position: relative;
  width: 160px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  transition: border-color 0.2s;
}

.box.is-empty:hover {
  border-color: #5b8ef5;
}

.box.is-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.box:hover .mask {
  opacity: 1;
}

.mask-btn {
  font-size: 12px;
  color: #ffffff;
}

.mask-btn.danger {
  color: #ffd7d7;
}

.plus {
  color: #a8abb2;
}

.tip {
  font-size: 12px;
  color: #909399;
}

.loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spin {
  animation: spin 1s linear infinite;
  color: #5b8ef5;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #a8abb2;
}
</style>
