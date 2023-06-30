const express = require('express')
const path = require('path');
const fs = require('fs')
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')
const uuid = require('uuid');
const app = express()
const port = 3000

let __scopeId = `data-v-${uuid.v4().split('-')[0]}`;
console.log(__scopeId);

app.get('*', (req, res) => {
  console.log(req.path, req.query)
  // const { url } = req.query
  const { type, scopeId } = req.query
  const reqPath = req.path
  if (reqPath === '/' || !reqPath) {
    // 加载静态html
    const data = fs.readFileSync(path.resolve(__dirname, `./front/index.html`), 'utf-8')
    res.setHeader('Content-Type', 'text/html');
    return res.send(data)
    // res.sendFile(path.resolve(__dirname, './front/index.html'))
  } else if (reqPath.endsWith('.js')) {
    // 加载js
    const data = fs.readFileSync(path.resolve(__dirname, `./front/${reqPath}`), 'utf-8')
    res.setHeader('Content-Type', 'application/javascript');
    // console.log('data===', data)
    return res.send(fromatImport(data))
  } else if (reqPath.startsWith('/@modules/')) {
    // 加载模块
    const target = reqPath.replace('/@modules/', '')
    // 去node_modules文件夹中，加载模块
    const modulePath =  path.resolve(__dirname, `../node_modules/${target}`)
    // console.log(`modulePath===: ${modulePath}`)
    // 找到打包后js文件
    const module = require(`${modulePath}/package.json`).module
    // console.log(`module===: ${module}`)
    const filePath = path.resolve(modulePath, module)
    // console.log(`filePath===: ${filePath}`)
    const data = fs.readFileSync(filePath, 'utf-8')
    res.setHeader('Content-Type', 'application/javascript');
    return res.send(fromatImport(data))
  } else if (reqPath.indexOf('.vue') > -1) {
    // 加载组件
    const componentPath = path.resolve(__dirname,`./front/${reqPath}` )
    const componentData = fs.readFileSync(componentPath, 'utf-8')
    const sfcData = compilerSFC.parse(componentData,)
    console.log(`sfcData===:`)
    console.log(sfcData)

    // 加载组件 script 内容
    if (!type) {
      __scopeId = `data-v-${uuid.v4().split('-')[0]}`;
      const scriptContent = sfcData.descriptor.script.content
      const script = scriptContent.replace('export default ', 'const __script = ')
      res.setHeader('Content-Type', 'application/javascript');
      return res.send(`${fromatImport(script)}
        import '${reqPath}?type=style&scopeId=${__scopeId}';
        // 解析tpl 模板
        import { render as __render } from '${reqPath}?type=tpl&scopeId=${__scopeId}';
        __script.render = __render
        __script.__scopeId = '${__scopeId}'
        export default __script
      `)
    }

    if (type === 'tpl') {
      const templateContent = sfcData.descriptor.template.content
      const render = compilerDOM.compile(templateContent, { mode: 'module'}).code
      res.setHeader('Content-Type', 'application/javascript');
      return res.send(fromatImport(render))
    }

    if (type === 'style') {
      const templateContent = sfcData.descriptor.styles
      const styleData = compilerSFC.compileStyle({
        source: templateContent[0].content,
        scoped: true,
        id: scopeId,
      }).code
      console.log('style')
      console.log(styleData)
      const __vite__id = reqPath;
      // console.log(templateContent[0])
      res.setHeader('Content-Type', 'application/javascript');
      return res.send(`
      const __style__ = \`${styleData}\`;
      removeStyle('${__vite__id}');
      updateStyle('${__vite__id}', \`${styleData.toString()}\`);
      export default __style__;`)
    }
  
  }  else if (reqPath.indexOf('.css') > -1) {
    // 加载样式 
    const cssPath = path.resolve(__dirname,`./front/${reqPath}` )
    const cssData = fs.readFileSync(cssPath, 'utf-8')
    // console.log('cssData===', cssData.toString())
    res.setHeader('Content-Type', 'application/javascript');
    const __vite__id = cssPath;
    return res.send(`
      const __vite__css = '${__vite__id}';
      removeStyle('${__vite__id}');
      updateStyle('${__vite__id}', \`${cssData.toString()}\`);
      export default __vite__css;
    `)
  } else if (reqPath.endsWith('.svg') > -1) {
    return res.sendFile(path.resolve(__dirname, `./front/${reqPath}`))
  } else {
    res.setHeader('Content-Type', 'application/javascript');
    return res.send(`export default { __path___: '404: ${reqPath}'}  ` )
  }
})

/**
 * 
 * @param {*} content 
 * @returns 
 * 
 * import { createApp, h, } from 'vue'
 * 转换
 * import { createApp, h, } from '/@modules/vue'
 */
function fromatImport(content) {
  return content.replace(/ from ['"](.*)['"]/g, (s1, s2) => {
    // console.log(`fromatImport=====:${s1}, ${s2} `, )
    // console.log(s2.startsWith('/'), s2.startsWith('./'), s2.startsWith('../'))
    if (s2.startsWith('/') || s2.startsWith('./') || s2.startsWith('../')) {
      return s1
    } else {
      return ` from '/@modules/${s2}'`
    }
  })
}
app.listen(port, () => {
  console.log(`Example app listening on port ${port} ${__dirname}`)
})