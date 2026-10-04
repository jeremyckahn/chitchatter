d.displayName="diff";d.aliases=[];function d(n){(function(i){i.languages.diff={coord:[/^(?:\*{3}|-{3}|\+{3}).*$/m,/^@@.*@@$/m,/^\d.*$/m]};var a={"deleted-sign":"-","deleted-arrow":"<","inserted-sign":"+","inserted-arrow":">",unchanged:" ",diff:"!"};Object.keys(a).forEach(function(e){var t=a[e],f=[];/^\w+$/.test(e)||f.push(/\w+/.exec(e)[0]),e==="diff"&&f.push("bold"),i.languages.diff[e]={pattern:RegExp("^(?:["+t+`].*(?:\r
?|
|(?![\\s\\S])))+`,"m"),alias:f,inside:{line:{pattern:/(.)(?=[\s\S]).*(?:\r\n?|\n)?/,lookbehind:!0},prefix:{pattern:/[\s\S]/,alias:/\w+/.exec(e)[0]}}}}),Object.defineProperty(i.languages.diff,"PREFIXES",{value:a})})(n)}export{d as default};
//# sourceMappingURL=diff-DU2I1BEy.js.map
