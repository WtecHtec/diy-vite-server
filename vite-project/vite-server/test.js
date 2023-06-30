let a  = '\n.read-the-docs {\n  color: #888;\n}\n'

a = a.replace(/\.(.*){/g, (s1, s2) => {
  console.log(s1,)
  console.log(s2)
  return `.${s2.trim()}[1111] {`
})

console.log(a)