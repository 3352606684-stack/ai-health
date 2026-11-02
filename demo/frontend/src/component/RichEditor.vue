<!--
  富文本编辑器（wangEditor 5 手动挂载版）

  为什么不用 @wangeditor/editor-for-vue：
    该包停更于 2021 年，内部 shallowRef 管理实例，在 Vue 3.4+ 会出现
    反复渲染 / 卸载报 null 的问题。手动 createEditor 更稳，也不依赖它。

  【对接的后端接口】
    POST /api/file/upload   multipart/form-data, 字段名 file
      → { code:200, data:{ url:'http://localhost:8080/uploads/xxx.png' } }
    正文本身以 HTML 字符串提交，后端存 longtext，入库前需 Jsoup 清洗。
-->
<template>
  <div class="rich-editor" :class="{ 'is-disabled': disabled }">
    <div ref="toolbarRef" class="toolbar"></div>
    <div ref="editorRef" class="content"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
// 编辑器自带样式是全局的，必须在 script 里引入一次
import '@wangeditor/editor/dist/css/style.css'
import { createEditor, createToolbar } from '@wangeditor/editor'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { uploadImage } from '../api/upload'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '320px' },
  placeholder: { type: String, default: '请输入正文内容' },
  disabled: { type: Boolean, default: false },
  maxImageSize: { type: Number, default: 5 } // MB
})
const emit = defineEmits(['update:modelValue'])

const toolbarRef = ref(null)
const editorRef = ref(null)
// 用 shallowRef 存实例：深响应式会把编辑器内部对象也劫持，导致卡顿甚至报错
const editor = shallowRef(null)
const toolbar = shallowRef(null)

const EMPTY_HTML = '<p><br></p>'

/* 空内容归一化成空字符串，避免往库里塞一堆无意义的空标签 */
function normalize(html) {
  return !html || html === EMPTY_HTML ? '' : html
}

onMounted(() => {
  editor.value = createEditor({
    selector: editorRef.value,
    html: props.modelValue || EMPTY_HTML,
    config: {
      placeholder: props.placeholder,
      MENU_CONF: {
        // 关键：用 customUpload 走项目的 request.js，
        // 这样 token、baseURL、错误提示、剥壳全都复用现有拦截器
        uploadImage: {
          async customUpload(file, insertFn) {
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
              return ElMessage.warning('只能插入 JPG / PNG / WebP / GIF 图片')
            }
            if (file.size > props.maxImageSize * 1024 * 1024) {
              return ElMessage.warning(`图片不能超过 ${props.maxImageSize}MB`)
            }
            try {
              const res = await uploadImage(file)
              if (!res?.url) throw new Error('接口未返回 url')
              insertFn(res.url, file.name, res.url)
            } catch (err) {
              if (err?.message === '接口未返回 url') ElMessage.error('图片上传失败：接口未返回地址')
              // 其余错误提示已由 request.js 拦截器统一弹出
            }
          }
        }
      },
      onChange(ed) {
        emit('update:modelValue', normalize(ed.getHtml()))
      }
    }
  })

  toolbar.value = createToolbar({
    editor: editor.value,
    selector: toolbarRef.value,
    config: {
      // 需要视频菜单就去掉这一行；excludeKeys 里写错的 key 会被忽略，不会报错
      excludeKeys: ['group-video']
    }
  })

  if (props.disabled) editor.value.disable()
})

/* 外部改值（如打开编辑弹窗回填）时同步进编辑器。
   onChange 抛出去的值和 getHtml() 相等，所以这里会直接 return，不会循环触发。 */
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    if (val === editor.value.getHtml()) return
    editor.value.setHtml(val || EMPTY_HTML)
  }
)

watch(
  () => props.disabled,
  (val) => {
    if (!editor.value) return
    val ? editor.value.disable() : editor.value.enable()
  }
)

onBeforeUnmount(() => {
  // 必须销毁，否则路由切走后监听和 DOM 引用会残留
  toolbar.value?.destroy()
  editor.value?.destroy()
  toolbar.value = null
  editor.value = null
})
</script>

<style scoped>
.rich-editor {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #ffffff;
  transition: border-color 0.2s;
}

.rich-editor:focus-within {
  border-color: #5b8ef5;
}

.rich-editor.is-disabled {
  background: #f5f7fa;
  cursor: not-allowed;
}

.toolbar {
  border-bottom: 1px solid #e4e7ed;
}

.content {
  height: v-bind(height);
  overflow-y: auto;
}

/* 让编辑器内容区铺满容器高度，否则点下方空白处不会聚焦 */
.content :deep(.w-e-text-container) {
  height: 100%;
}

.content :deep(.w-e-text-container [data-slate-editor]) {
  min-height: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.7;
}

/* 工具栏字号和项目其他表单一一致 */
.toolbar :deep(.w-e-bar) {
  font-size: 13px;
}
</style>
