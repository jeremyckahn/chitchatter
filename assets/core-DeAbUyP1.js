import{i as xe,g as Gr}from"./index-08w7jhFj.js";import{r as Vr}from"./markup-BONeskWm.js";import{r as Kr}from"./css-CF9HHZb0.js";import{r as Jr}from"./clike-B5tY_8Hg.js";import{r as Yr}from"./javascript-D8vYUPHd.js";function Qr(l,f){for(var u=0;u<f.length;u++){const r=f[u];if(typeof r!="string"&&!Array.isArray(r)){for(const d in r)if(d!=="default"&&!(d in l)){const h=Object.getOwnPropertyDescriptor(r,d);h&&Object.defineProperty(l,d,h.get?h:{enumerable:!0,get:()=>r[d]})}}}return Object.freeze(Object.defineProperty(l,Symbol.toStringTag,{value:"Module"}))}var Pe,ur;function Zr(){if(ur)return Pe;ur=1,Pe=f;var l=Object.prototype.hasOwnProperty;function f(){for(var u={},r=0;r<arguments.length;r++){var d=arguments[r];for(var h in d)l.call(d,h)&&(u[h]=d[h])}return u}return Pe}var Ee,sr;function jr(){if(sr)return Ee;sr=1,Ee=f;var l=f.prototype;l.space=null,l.normal={},l.property={};function f(u,r,d){this.property=u,this.normal=r,d&&(this.space=d)}return Ee}var Te,cr;function en(){if(cr)return Te;cr=1;var l=Zr(),f=jr();Te=u;function u(r){for(var d=r.length,h=[],v=[],a=-1,g,A;++a<d;)g=r[a],h.push(g.property),v.push(g.normal),A=g.space;return new f(l.apply(null,h),l.apply(null,v),A)}return Te}var ke,fr;function er(){if(fr)return ke;fr=1,ke=l;function l(f){return f.toLowerCase()}return ke}var Re,dr;function zr(){if(dr)return Re;dr=1,Re=f;var l=f.prototype;l.space=null,l.attribute=null,l.property=null,l.boolean=!1,l.booleanish=!1,l.overloadedBoolean=!1,l.number=!1,l.commaSeparated=!1,l.spaceSeparated=!1,l.commaOrSpaceSeparated=!1,l.mustUseProperty=!1,l.defined=!1;function f(u,r){this.property=u,this.attribute=r}return Re}var W={},vr;function rr(){if(vr)return W;vr=1;var l=0;W.boolean=f(),W.booleanish=f(),W.overloadedBoolean=f(),W.number=f(),W.spaceSeparated=f(),W.commaSeparated=f(),W.commaOrSpaceSeparated=f();function f(){return Math.pow(2,++l)}return W}var Le,pr;function _r(){if(pr)return Le;pr=1;var l=zr(),f=rr();Le=d,d.prototype=new l,d.prototype.defined=!0;var u=["boolean","booleanish","overloadedBoolean","number","commaSeparated","spaceSeparated","commaOrSpaceSeparated"],r=u.length;function d(v,a,g,A){var T=-1,m;for(h(this,"space",A),l.call(this,v,a);++T<r;)m=u[T],h(this,m,(g&f[m])===f[m])}function h(v,a,g){g&&(v[a]=g)}return Le}var Ie,hr;function ve(){if(hr)return Ie;hr=1;var l=er(),f=jr(),u=_r();Ie=r;function r(d){var h=d.space,v=d.mustUseProperty||[],a=d.attributes||{},g=d.properties,A=d.transform,T={},m={},w,S;for(w in g)S=new u(w,A(a,w),g[w],h),v.indexOf(w)!==-1&&(S.mustUseProperty=!0),T[w]=S,m[l(w)]=w,m[l(S.attribute)]=w;return new f(T,m,h)}return Ie}var Me,gr;function rn(){if(gr)return Me;gr=1;var l=ve();Me=l({space:"xlink",transform:f,properties:{xLinkActuate:null,xLinkArcRole:null,xLinkHref:null,xLinkRole:null,xLinkShow:null,xLinkTitle:null,xLinkType:null}});function f(u,r){return"xlink:"+r.slice(5).toLowerCase()}return Me}var Oe,mr;function nn(){if(mr)return Oe;mr=1;var l=ve();Oe=l({space:"xml",transform:f,properties:{xmlLang:null,xmlBase:null,xmlSpace:null}});function f(u,r){return"xml:"+r.slice(3).toLowerCase()}return Oe}var De,yr;function an(){if(yr)return De;yr=1,De=l;function l(f,u){return u in f?f[u]:u}return De}var He,xr;function Br(){if(xr)return He;xr=1;var l=an();He=f;function f(u,r){return l(u,r.toLowerCase())}return He}var Ne,br;function tn(){if(br)return Ne;br=1;var l=ve(),f=Br();return Ne=l({space:"xmlns",attributes:{xmlnsxlink:"xmlns:xlink"},transform:f,properties:{xmlns:null,xmlnsXLink:null}}),Ne}var Ue,wr;function ln(){if(wr)return Ue;wr=1;var l=rr(),f=ve(),u=l.booleanish,r=l.number,d=l.spaceSeparated;Ue=f({transform:h,properties:{ariaActiveDescendant:null,ariaAtomic:u,ariaAutoComplete:null,ariaBusy:u,ariaChecked:u,ariaColCount:r,ariaColIndex:r,ariaColSpan:r,ariaControls:d,ariaCurrent:null,ariaDescribedBy:d,ariaDetails:null,ariaDisabled:u,ariaDropEffect:d,ariaErrorMessage:null,ariaExpanded:u,ariaFlowTo:d,ariaGrabbed:u,ariaHasPopup:null,ariaHidden:u,ariaInvalid:null,ariaKeyShortcuts:null,ariaLabel:null,ariaLabelledBy:d,ariaLevel:r,ariaLive:null,ariaModal:u,ariaMultiLine:u,ariaMultiSelectable:u,ariaOrientation:null,ariaOwns:d,ariaPlaceholder:null,ariaPosInSet:r,ariaPressed:u,ariaReadOnly:u,ariaRelevant:null,ariaRequired:u,ariaRoleDescription:d,ariaRowCount:r,ariaRowIndex:r,ariaRowSpan:r,ariaSelected:u,ariaSetSize:r,ariaSort:null,ariaValueMax:r,ariaValueMin:r,ariaValueNow:r,ariaValueText:null,role:null}});function h(v,a){return a==="role"?a:"aria-"+a.slice(4).toLowerCase()}return Ue}var je,Cr;function on(){if(Cr)return je;Cr=1;var l=rr(),f=ve(),u=Br(),r=l.boolean,d=l.overloadedBoolean,h=l.booleanish,v=l.number,a=l.spaceSeparated,g=l.commaSeparated;return je=f({space:"html",attributes:{acceptcharset:"accept-charset",classname:"class",htmlfor:"for",httpequiv:"http-equiv"},transform:u,mustUseProperty:["checked","multiple","muted","selected"],properties:{abbr:null,accept:g,acceptCharset:a,accessKey:a,action:null,allow:null,allowFullScreen:r,allowPaymentRequest:r,allowUserMedia:r,alt:null,as:null,async:r,autoCapitalize:null,autoComplete:a,autoFocus:r,autoPlay:r,capture:r,charSet:null,checked:r,cite:null,className:a,cols:v,colSpan:null,content:null,contentEditable:h,controls:r,controlsList:a,coords:v|g,crossOrigin:null,data:null,dateTime:null,decoding:null,default:r,defer:r,dir:null,dirName:null,disabled:r,download:d,draggable:h,encType:null,enterKeyHint:null,form:null,formAction:null,formEncType:null,formMethod:null,formNoValidate:r,formTarget:null,headers:a,height:v,hidden:r,high:v,href:null,hrefLang:null,htmlFor:a,httpEquiv:a,id:null,imageSizes:null,imageSrcSet:g,inputMode:null,integrity:null,is:null,isMap:r,itemId:null,itemProp:a,itemRef:a,itemScope:r,itemType:a,kind:null,label:null,lang:null,language:null,list:null,loading:null,loop:r,low:v,manifest:null,max:null,maxLength:v,media:null,method:null,min:null,minLength:v,multiple:r,muted:r,name:null,nonce:null,noModule:r,noValidate:r,onAbort:null,onAfterPrint:null,onAuxClick:null,onBeforePrint:null,onBeforeUnload:null,onBlur:null,onCancel:null,onCanPlay:null,onCanPlayThrough:null,onChange:null,onClick:null,onClose:null,onContextMenu:null,onCopy:null,onCueChange:null,onCut:null,onDblClick:null,onDrag:null,onDragEnd:null,onDragEnter:null,onDragExit:null,onDragLeave:null,onDragOver:null,onDragStart:null,onDrop:null,onDurationChange:null,onEmptied:null,onEnded:null,onError:null,onFocus:null,onFormData:null,onHashChange:null,onInput:null,onInvalid:null,onKeyDown:null,onKeyPress:null,onKeyUp:null,onLanguageChange:null,onLoad:null,onLoadedData:null,onLoadedMetadata:null,onLoadEnd:null,onLoadStart:null,onMessage:null,onMessageError:null,onMouseDown:null,onMouseEnter:null,onMouseLeave:null,onMouseMove:null,onMouseOut:null,onMouseOver:null,onMouseUp:null,onOffline:null,onOnline:null,onPageHide:null,onPageShow:null,onPaste:null,onPause:null,onPlay:null,onPlaying:null,onPopState:null,onProgress:null,onRateChange:null,onRejectionHandled:null,onReset:null,onResize:null,onScroll:null,onSecurityPolicyViolation:null,onSeeked:null,onSeeking:null,onSelect:null,onSlotChange:null,onStalled:null,onStorage:null,onSubmit:null,onSuspend:null,onTimeUpdate:null,onToggle:null,onUnhandledRejection:null,onUnload:null,onVolumeChange:null,onWaiting:null,onWheel:null,open:r,optimum:v,pattern:null,ping:a,placeholder:null,playsInline:r,poster:null,preload:null,readOnly:r,referrerPolicy:null,rel:a,required:r,reversed:r,rows:v,rowSpan:v,sandbox:a,scope:null,scoped:r,seamless:r,selected:r,shape:null,size:v,sizes:null,slot:null,span:v,spellCheck:h,src:null,srcDoc:null,srcLang:null,srcSet:g,start:v,step:null,style:null,tabIndex:v,target:null,title:null,translate:null,type:null,typeMustMatch:r,useMap:null,value:h,width:v,wrap:null,align:null,aLink:null,archive:a,axis:null,background:null,bgColor:null,border:v,borderColor:null,bottomMargin:v,cellPadding:null,cellSpacing:null,char:null,charOff:null,classId:null,clear:null,code:null,codeBase:null,codeType:null,color:null,compact:r,declare:r,event:null,face:null,frame:null,frameBorder:null,hSpace:v,leftMargin:v,link:null,longDesc:null,lowSrc:null,marginHeight:v,marginWidth:v,noResize:r,noHref:r,noShade:r,noWrap:r,object:null,profile:null,prompt:null,rev:null,rightMargin:v,rules:null,scheme:null,scrolling:h,standby:null,summary:null,text:null,topMargin:v,valueType:null,version:null,vAlign:null,vLink:null,vSpace:v,allowTransparency:null,autoCorrect:null,autoSave:null,disablePictureInPicture:r,disableRemotePlayback:r,prefix:null,property:null,results:v,security:null,unselectable:null}}),je}var ze,Sr;function un(){if(Sr)return ze;Sr=1;var l=en(),f=rn(),u=nn(),r=tn(),d=ln(),h=on();return ze=l([u,f,r,d,h]),ze}var _e,qr;function sn(){if(qr)return _e;qr=1;var l=er(),f=_r(),u=zr(),r="data";_e=a;var d=/^data[-\w.:]+$/i,h=/-[a-z]/g,v=/[A-Z]/g;function a(w,S){var b=l(S),y=S,x=u;return b in w.normal?w.property[w.normal[b]]:(b.length>4&&b.slice(0,4)===r&&d.test(S)&&(S.charAt(4)==="-"?y=g(S):S=A(S),x=f),new x(y,S))}function g(w){var S=w.slice(5).replace(h,m);return r+S.charAt(0).toUpperCase()+S.slice(1)}function A(w){var S=w.slice(4);return h.test(S)?w:(S=S.replace(v,T),S.charAt(0)!=="-"&&(S="-"+S),r+S)}function T(w){return"-"+w.toLowerCase()}function m(w){return w.charAt(1).toUpperCase()}return _e}var Be,Ar;function cn(){if(Ar)return Be;Ar=1,Be=f;var l=/[#.]/g;function f(u,r){for(var d=u||"",h=r||"div",v={},a=0,g,A,T;a<d.length;)l.lastIndex=a,T=l.exec(d),g=d.slice(a,T?T.index:d.length),g&&(A?A==="#"?v.id=g:v.className?v.className.push(g):v.className=[g]:h=g,a+=g.length),T&&(A=T[0],a++);return{type:"element",tagName:h,properties:v,children:[]}}return Be}var me={},Pr;function fn(){if(Pr)return me;Pr=1,me.parse=r,me.stringify=d;var l="",f=" ",u=/[ \t\n\r\f]+/g;function r(h){var v=String(h||l).trim();return v===l?[]:v.split(u)}function d(h){return h.join(f).trim()}return me}var ye={},Er;function dn(){if(Er)return ye;Er=1,ye.parse=r,ye.stringify=d;var l=",",f=" ",u="";function r(h){for(var v=[],a=String(h||u),g=a.indexOf(l),A=0,T=!1,m;!T;)g===-1&&(g=a.length,T=!0),m=a.slice(A,g).trim(),(m||!T)&&v.push(m),A=g+1,g=a.indexOf(l,A);return v}function d(h,v){var a=v||{},g=a.padLeft===!1?u:f,A=a.padRight?f:u;return h[h.length-1]===u&&(h=h.concat(u)),h.join(A+l+g).trim()}return ye}var Fe,Tr;function vn(){if(Tr)return Fe;Tr=1;var l=sn(),f=er(),u=cn(),r=fn().parse,d=dn().parse;Fe=v;var h={}.hasOwnProperty;function v(b,y,x){var P=x?S(x):null;return t;function t(c,s){var e=u(c,y),i=Array.prototype.slice.call(arguments,2),p=e.tagName.toLowerCase(),o;if(e.tagName=P&&h.call(P,p)?P[p]:p,s&&a(s,e)&&(i.unshift(s),s=null),s)for(o in s)n(e.properties,o,s[o]);return A(e.children,i),e.tagName==="template"&&(e.content={type:"root",children:e.children},e.children=[]),e}function n(c,s,e){var i,p,o;e==null||e!==e||(i=l(b,s),p=i.property,o=e,typeof o=="string"&&(i.spaceSeparated?o=r(o):i.commaSeparated?o=d(o):i.commaOrSpaceSeparated&&(o=r(d(o).join(" ")))),p==="style"&&typeof e!="string"&&(o=w(o)),p==="className"&&c.className&&(o=c.className.concat(o)),c[p]=T(i,p,o))}}function a(b,y){return typeof b=="string"||"length"in b||g(y.tagName,b)}function g(b,y){var x=y.type;return b==="input"||!x||typeof x!="string"?!1:typeof y.children=="object"&&"length"in y.children?!0:(x=x.toLowerCase(),b==="button"?x!=="menu"&&x!=="submit"&&x!=="reset"&&x!=="button":"value"in y)}function A(b,y){var x,P;if(typeof y=="string"||typeof y=="number"){b.push({type:"text",value:String(y)});return}if(typeof y=="object"&&"length"in y){for(x=-1,P=y.length;++x<P;)A(b,y[x]);return}if(typeof y!="object"||!("type"in y))throw new Error("Expected node, nodes, or string, got `"+y+"`");b.push(y)}function T(b,y,x){var P,t,n;if(typeof x!="object"||!("length"in x))return m(b,y,x);for(t=x.length,P=-1,n=[];++P<t;)n[P]=m(b,y,x[P]);return n}function m(b,y,x){var P=x;return b.number||b.positiveNumber?!isNaN(P)&&P!==""&&(P=Number(P)):(b.boolean||b.overloadedBoolean)&&typeof P=="string"&&(P===""||f(x)===f(y))&&(P=!0),P}function w(b){var y=[],x;for(x in b)y.push([x,b[x]].join(": "));return y.join("; ")}function S(b){for(var y=b.length,x=-1,P={},t;++x<y;)t=b[x],P[t.toLowerCase()]=t;return P}return Fe}var $e,kr;function pn(){if(kr)return $e;kr=1;var l=un(),f=vn(),u=f(l,"div");return u.displayName="html",$e=u,$e}var We,Rr;function hn(){return Rr||(Rr=1,We=pn()),We}const gn="Æ",mn="&",yn="Á",xn="Â",bn="À",wn="Å",Cn="Ã",Sn="Ä",qn="©",An="Ç",Pn="Ð",En="É",Tn="Ê",kn="È",Rn="Ë",Ln=">",In="Í",Mn="Î",On="Ì",Dn="Ï",Hn="<",Nn="Ñ",Un="Ó",jn="Ô",zn="Ò",_n="Ø",Bn="Õ",Fn="Ö",$n='"',Wn="®",Xn="Þ",Gn="Ú",Vn="Û",Kn="Ù",Jn="Ü",Yn="Ý",Qn="á",Zn="â",ea="´",ra="æ",na="à",aa="&",ta="å",la="ã",ia="ä",oa="¦",ua="ç",sa="¸",ca="¢",fa="©",da="¤",va="°",pa="÷",ha="é",ga="ê",ma="è",ya="ð",xa="ë",ba="½",wa="¼",Ca="¾",Sa=">",qa="í",Aa="î",Pa="¡",Ea="ì",Ta="¿",ka="ï",Ra="«",La="<",Ia="¯",Ma="µ",Oa="·",Da=" ",Ha="¬",Na="ñ",Ua="ó",ja="ô",za="ò",_a="ª",Ba="º",Fa="ø",$a="õ",Wa="ö",Xa="¶",Ga="±",Va="£",Ka='"',Ja="»",Ya="®",Qa="§",Za="­",et="¹",rt="²",nt="³",at="ß",tt="þ",lt="×",it="ú",ot="û",ut="ù",st="¨",ct="ü",ft="ý",dt="¥",vt="ÿ",pt={AElig:gn,AMP:mn,Aacute:yn,Acirc:xn,Agrave:bn,Aring:wn,Atilde:Cn,Auml:Sn,COPY:qn,Ccedil:An,ETH:Pn,Eacute:En,Ecirc:Tn,Egrave:kn,Euml:Rn,GT:Ln,Iacute:In,Icirc:Mn,Igrave:On,Iuml:Dn,LT:Hn,Ntilde:Nn,Oacute:Un,Ocirc:jn,Ograve:zn,Oslash:_n,Otilde:Bn,Ouml:Fn,QUOT:$n,REG:Wn,THORN:Xn,Uacute:Gn,Ucirc:Vn,Ugrave:Kn,Uuml:Jn,Yacute:Yn,aacute:Qn,acirc:Zn,acute:ea,aelig:ra,agrave:na,amp:aa,aring:ta,atilde:la,auml:ia,brvbar:oa,ccedil:ua,cedil:sa,cent:ca,copy:fa,curren:da,deg:va,divide:pa,eacute:ha,ecirc:ga,egrave:ma,eth:ya,euml:xa,frac12:ba,frac14:wa,frac34:Ca,gt:Sa,iacute:qa,icirc:Aa,iexcl:Pa,igrave:Ea,iquest:Ta,iuml:ka,laquo:Ra,lt:La,macr:Ia,micro:Ma,middot:Oa,nbsp:Da,not:Ha,ntilde:Na,oacute:Ua,ocirc:ja,ograve:za,ordf:_a,ordm:Ba,oslash:Fa,otilde:$a,ouml:Wa,para:Xa,plusmn:Ga,pound:Va,quot:Ka,raquo:Ja,reg:Ya,sect:Qa,shy:Za,sup1:et,sup2:rt,sup3:nt,szlig:at,thorn:tt,times:lt,uacute:it,ucirc:ot,ugrave:ut,uml:st,uuml:ct,yacute:ft,yen:dt,yuml:vt},ht={0:"�",128:"€",130:"‚",131:"ƒ",132:"„",133:"…",134:"†",135:"‡",136:"ˆ",137:"‰",138:"Š",139:"‹",140:"Œ",142:"Ž",145:"‘",146:"’",147:"“",148:"”",149:"•",150:"–",151:"—",152:"˜",153:"™",154:"š",155:"›",156:"œ",158:"ž",159:"Ÿ"};var Xe,Lr;function Fr(){if(Lr)return Xe;Lr=1,Xe=l;function l(f){var u=typeof f=="string"?f.charCodeAt(0):f;return u>=48&&u<=57}return Xe}var Ge,Ir;function gt(){if(Ir)return Ge;Ir=1,Ge=l;function l(f){var u=typeof f=="string"?f.charCodeAt(0):f;return u>=97&&u<=102||u>=65&&u<=70||u>=48&&u<=57}return Ge}var Ve,Mr;function mt(){if(Mr)return Ve;Mr=1,Ve=l;function l(f){var u=typeof f=="string"?f.charCodeAt(0):f;return u>=97&&u<=122||u>=65&&u<=90}return Ve}var Ke,Or;function yt(){if(Or)return Ke;Or=1;var l=mt(),f=Fr();Ke=u;function u(r){return l(r)||f(r)}return Ke}var Je,Dr;function xt(){if(Dr)return Je;Dr=1;var l,f=59;Je=u;function u(r){var d="&"+r+";",h;return l=l||document.createElement("i"),l.innerHTML=d,h=l.textContent,h.charCodeAt(h.length-1)===f&&r!=="semi"||h===d?!1:h}return Je}var Ye,Hr;function bt(){if(Hr)return Ye;Hr=1;var l=pt,f=ht,u=Fr(),r=gt(),d=yt(),h=xt();Ye=U;var v={}.hasOwnProperty,a=String.fromCharCode,g=Function.prototype,A={warning:null,reference:null,text:null,warningContext:null,referenceContext:null,textContext:null,position:{},additional:null,attribute:!1,nonTerminated:!0},T=9,m=10,w=12,S=32,b=38,y=59,x=60,P=61,t=35,n=88,c=120,s=65533,e="named",i="hexadecimal",p="decimal",o={};o[i]=16,o[p]=10;var q={};q[e]=d,q[p]=u,q[i]=r;var C=1,D=2,F=3,le=4,pe=5,ie=6,oe=7,k={};k[C]="Named character references must be terminated by a semicolon",k[D]="Numeric character references must be terminated by a semicolon",k[F]="Named character references cannot be empty",k[le]="Numeric character references cannot be empty",k[pe]="Named character references must be known",k[ie]="Numeric character references cannot be disallowed",k[oe]="Numeric character references cannot be outside the permissible Unicode range";function U(E,R){var L={},z,j;R||(R={});for(j in A)z=R[j],L[j]=z??A[j];return(L.position.indent||L.position.start)&&(L.indent=L.position.indent||[],L.position=L.position.start),X(E,L)}function X(E,R){var L=R.additional,z=R.nonTerminated,j=R.text,ne=R.reference,ue=R.warning,se=R.textContext,ae=R.referenceContext,be=R.warningContext,K=R.position,Wr=R.indent||[],we=E.length,G=0,nr=-1,J=K.column||1,ar=K.line||1,Y="",Ce=[],te,Se,Q,N,V,M,I,_,he,qe,Z,ce,ee,$,tr,fe,ge,B,O;for(typeof L=="string"&&(L=L.charCodeAt(0)),fe=de(),_=ue?Xr:g,G--,we++;++G<we;)if(V===m&&(J=Wr[nr]||1),V=E.charCodeAt(G),V===b){if(I=E.charCodeAt(G+1),I===T||I===m||I===w||I===S||I===b||I===x||I!==I||L&&I===L){Y+=a(V),J++;continue}for(ee=G+1,ce=ee,O=ee,I===t?(O=++ce,I=E.charCodeAt(O),I===n||I===c?($=i,O=++ce):$=p):$=e,te="",Z="",N="",tr=q[$],O--;++O<we&&(I=E.charCodeAt(O),!!tr(I));)N+=a(I),$===e&&v.call(l,N)&&(te=N,Z=l[N]);Q=E.charCodeAt(O)===y,Q&&(O++,Se=$===e?h(N):!1,Se&&(te=N,Z=Se)),B=1+O-ee,!Q&&!z||(N?$===e?(Q&&!Z?_(pe,1):(te!==N&&(O=ce+te.length,B=1+O-ce,Q=!1),Q||(he=te?C:F,R.attribute?(I=E.charCodeAt(O),I===P?(_(he,B),Z=null):d(I)?Z=null:_(he,B)):_(he,B))),M=Z):(Q||_(D,B),M=parseInt(N,o[$]),re(M)?(_(oe,B),M=a(s)):M in f?(_(ie,B),M=f[M]):(qe="",H(M)&&_(ie,B),M>65535&&(M-=65536,qe+=a(M>>>10|55296),M=56320|M&1023),M=qe+a(M))):$!==e&&_(le,B)),M?(lr(),fe=de(),G=O-1,J+=O-ee+1,Ce.push(M),ge=de(),ge.offset++,ne&&ne.call(ae,M,{start:fe,end:ge},E.slice(ee-1,O)),fe=ge):(N=E.slice(ee-1,O),Y+=N,J+=N.length,G=O-1)}else V===10&&(ar++,nr++,J=0),V===V?(Y+=a(V),J++):lr();return Ce.join("");function de(){return{line:ar,column:J,offset:G+(K.offset||0)}}function Xr(ir,or){var Ae=de();Ae.column+=or,Ae.offset+=or,ue.call(be,k[ir],Ae,ir)}function lr(){Y&&(Ce.push(Y),j&&j.call(se,Y,{start:fe,end:de()}),Y="")}}function re(E){return E>=55296&&E<=57343||E>1114111}function H(E){return E>=1&&E<=8||E===11||E>=13&&E<=31||E>=127&&E<=159||E>=64976&&E<=65007||(E&65535)===65535||(E&65535)===65534}return Ye}var Qe={exports:{}},Nr;function wt(){return Nr||(Nr=1,function(l){var f=typeof window<"u"?window:typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?self:{};/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */var u=function(r){var d=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,h=0,v={},a={manual:r.Prism&&r.Prism.manual,disableWorkerMessageHandler:r.Prism&&r.Prism.disableWorkerMessageHandler,util:{encode:function t(n){return n instanceof g?new g(n.type,t(n.content),n.alias):Array.isArray(n)?n.map(t):n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(t){return Object.prototype.toString.call(t).slice(8,-1)},objId:function(t){return t.__id||Object.defineProperty(t,"__id",{value:++h}),t.__id},clone:function t(n,c){c=c||{};var s,e;switch(a.util.type(n)){case"Object":if(e=a.util.objId(n),c[e])return c[e];s={},c[e]=s;for(var i in n)n.hasOwnProperty(i)&&(s[i]=t(n[i],c));return s;case"Array":return e=a.util.objId(n),c[e]?c[e]:(s=[],c[e]=s,n.forEach(function(p,o){s[o]=t(p,c)}),s);default:return n}},getLanguage:function(t){for(;t;){var n=d.exec(t.className);if(n)return n[1].toLowerCase();t=t.parentElement}return"none"},setLanguage:function(t,n){t.className=t.className.replace(RegExp(d,"gi"),""),t.classList.add("language-"+n)},currentScript:function(){if(typeof document>"u")return null;if("currentScript"in document)return document.currentScript;try{throw new Error}catch(s){var t=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(s.stack)||[])[1];if(t){var n=document.getElementsByTagName("script");for(var c in n)if(n[c].src==t)return n[c]}return null}},isActive:function(t,n,c){for(var s="no-"+n;t;){var e=t.classList;if(e.contains(n))return!0;if(e.contains(s))return!1;t=t.parentElement}return!!c}},languages:{plain:v,plaintext:v,text:v,txt:v,extend:function(t,n){var c=a.util.clone(a.languages[t]);for(var s in n)c[s]=n[s];return c},insertBefore:function(t,n,c,s){s=s||a.languages;var e=s[t],i={};for(var p in e)if(e.hasOwnProperty(p)){if(p==n)for(var o in c)c.hasOwnProperty(o)&&(i[o]=c[o]);c.hasOwnProperty(p)||(i[p]=e[p])}var q=s[t];return s[t]=i,a.languages.DFS(a.languages,function(C,D){D===q&&C!=t&&(this[C]=i)}),i},DFS:function t(n,c,s,e){e=e||{};var i=a.util.objId;for(var p in n)if(n.hasOwnProperty(p)){c.call(n,p,n[p],s||p);var o=n[p],q=a.util.type(o);q==="Object"&&!e[i(o)]?(e[i(o)]=!0,t(o,c,null,e)):q==="Array"&&!e[i(o)]&&(e[i(o)]=!0,t(o,c,p,e))}}},plugins:{},highlightAll:function(t,n){a.highlightAllUnder(document,t,n)},highlightAllUnder:function(t,n,c){var s={callback:c,container:t,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};a.hooks.run("before-highlightall",s),s.elements=Array.prototype.slice.apply(s.container.querySelectorAll(s.selector)),a.hooks.run("before-all-elements-highlight",s);for(var e=0,i;i=s.elements[e++];)a.highlightElement(i,n===!0,s.callback)},highlightElement:function(t,n,c){var s=a.util.getLanguage(t),e=a.languages[s];a.util.setLanguage(t,s);var i=t.parentElement;i&&i.nodeName.toLowerCase()==="pre"&&a.util.setLanguage(i,s);var p=t.textContent,o={element:t,language:s,grammar:e,code:p};function q(D){o.highlightedCode=D,a.hooks.run("before-insert",o),o.element.innerHTML=o.highlightedCode,a.hooks.run("after-highlight",o),a.hooks.run("complete",o),c&&c.call(o.element)}if(a.hooks.run("before-sanity-check",o),i=o.element.parentElement,i&&i.nodeName.toLowerCase()==="pre"&&!i.hasAttribute("tabindex")&&i.setAttribute("tabindex","0"),!o.code){a.hooks.run("complete",o),c&&c.call(o.element);return}if(a.hooks.run("before-highlight",o),!o.grammar){q(a.util.encode(o.code));return}if(n&&r.Worker){var C=new Worker(a.filename);C.onmessage=function(D){q(D.data)},C.postMessage(JSON.stringify({language:o.language,code:o.code,immediateClose:!0}))}else q(a.highlight(o.code,o.grammar,o.language))},highlight:function(t,n,c){var s={code:t,grammar:n,language:c};if(a.hooks.run("before-tokenize",s),!s.grammar)throw new Error('The language "'+s.language+'" has no grammar.');return s.tokens=a.tokenize(s.code,s.grammar),a.hooks.run("after-tokenize",s),g.stringify(a.util.encode(s.tokens),s.language)},tokenize:function(t,n){var c=n.rest;if(c){for(var s in c)n[s]=c[s];delete n.rest}var e=new m;return w(e,e.head,t),T(t,e,n,e.head,0),b(e)},hooks:{all:{},add:function(t,n){var c=a.hooks.all;c[t]=c[t]||[],c[t].push(n)},run:function(t,n){var c=a.hooks.all[t];if(!(!c||!c.length))for(var s=0,e;e=c[s++];)e(n)}},Token:g};r.Prism=a;function g(t,n,c,s){this.type=t,this.content=n,this.alias=c,this.length=(s||"").length|0}g.stringify=function t(n,c){if(typeof n=="string")return n;if(Array.isArray(n)){var s="";return n.forEach(function(q){s+=t(q,c)}),s}var e={type:n.type,content:t(n.content,c),tag:"span",classes:["token",n.type],attributes:{},language:c},i=n.alias;i&&(Array.isArray(i)?Array.prototype.push.apply(e.classes,i):e.classes.push(i)),a.hooks.run("wrap",e);var p="";for(var o in e.attributes)p+=" "+o+'="'+(e.attributes[o]||"").replace(/"/g,"&quot;")+'"';return"<"+e.tag+' class="'+e.classes.join(" ")+'"'+p+">"+e.content+"</"+e.tag+">"};function A(t,n,c,s){t.lastIndex=n;var e=t.exec(c);if(e&&s&&e[1]){var i=e[1].length;e.index+=i,e[0]=e[0].slice(i)}return e}function T(t,n,c,s,e,i){for(var p in c)if(!(!c.hasOwnProperty(p)||!c[p])){var o=c[p];o=Array.isArray(o)?o:[o];for(var q=0;q<o.length;++q){if(i&&i.cause==p+","+q)return;var C=o[q],D=C.inside,F=!!C.lookbehind,le=!!C.greedy,pe=C.alias;if(le&&!C.pattern.global){var ie=C.pattern.toString().match(/[imsuy]*$/)[0];C.pattern=RegExp(C.pattern.source,ie+"g")}for(var oe=C.pattern||C,k=s.next,U=e;k!==n.tail&&!(i&&U>=i.reach);U+=k.value.length,k=k.next){var X=k.value;if(n.length>t.length)return;if(!(X instanceof g)){var re=1,H;if(le){if(H=A(oe,U,t,F),!H||H.index>=t.length)break;var z=H.index,E=H.index+H[0].length,R=U;for(R+=k.value.length;z>=R;)k=k.next,R+=k.value.length;if(R-=k.value.length,U=R,k.value instanceof g)continue;for(var L=k;L!==n.tail&&(R<E||typeof L.value=="string");L=L.next)re++,R+=L.value.length;re--,X=t.slice(U,R),H.index-=U}else if(H=A(oe,0,X,F),!H)continue;var z=H.index,j=H[0],ne=X.slice(0,z),ue=X.slice(z+j.length),se=U+X.length;i&&se>i.reach&&(i.reach=se);var ae=k.prev;ne&&(ae=w(n,ae,ne),U+=ne.length),S(n,ae,re);var be=new g(p,D?a.tokenize(j,D):j,pe,j);if(k=w(n,ae,be),ue&&w(n,k,ue),re>1){var K={cause:p+","+q,reach:se};T(t,n,c,k.prev,U,K),i&&K.reach>i.reach&&(i.reach=K.reach)}}}}}}function m(){var t={value:null,prev:null,next:null},n={value:null,prev:t,next:null};t.next=n,this.head=t,this.tail=n,this.length=0}function w(t,n,c){var s=n.next,e={value:c,prev:n,next:s};return n.next=e,s.prev=e,t.length++,e}function S(t,n,c){for(var s=n.next,e=0;e<c&&s!==t.tail;e++)s=s.next;n.next=s,s.prev=n,t.length-=e}function b(t){for(var n=[],c=t.head.next;c!==t.tail;)n.push(c.value),c=c.next;return n}if(!r.document)return r.addEventListener&&(a.disableWorkerMessageHandler||r.addEventListener("message",function(t){var n=JSON.parse(t.data),c=n.language,s=n.code,e=n.immediateClose;r.postMessage(a.highlight(s,a.languages[c],c)),e&&r.close()},!1)),a;var y=a.util.currentScript();y&&(a.filename=y.src,y.hasAttribute("data-manual")&&(a.manual=!0));function x(){a.manual||a.highlightAll()}if(!a.manual){var P=document.readyState;P==="loading"||P==="interactive"&&y&&y.defer?document.addEventListener("DOMContentLoaded",x):window.requestAnimationFrame?window.requestAnimationFrame(x):window.setTimeout(x,16)}return a}(f);l.exports&&(l.exports=u),typeof xe<"u"&&(xe.Prism=u)}(Qe)),Qe.exports}var Ze,Ur;function Ct(){if(Ur)return Ze;Ur=1;var l=typeof globalThis=="object"?globalThis:typeof self=="object"?self:typeof window=="object"?window:typeof xe=="object"?xe:{},f=s();l.Prism={manual:!0,disableWorkerMessageHandler:!0};var u=hn(),r=bt(),d=wt(),h=Vr(),v=Kr(),a=Jr(),g=Yr();f();var A={}.hasOwnProperty;function T(){}T.prototype=d;var m=new T;Ze=m,m.highlight=b,m.register=w,m.alias=S,m.registered=y,m.listLanguages=x,w(h),w(v),w(a),w(g),m.util.encode=n,m.Token.stringify=P;function w(e){if(typeof e!="function"||!e.displayName)throw new Error("Expected `function` for `grammar`, got `"+e+"`");m.languages[e.displayName]===void 0&&e(m)}function S(e,i){var p=m.languages,o=e,q,C,D,F;i&&(o={},o[e]=i);for(q in o)for(C=o[q],C=typeof C=="string"?[C]:C,D=C.length,F=-1;++F<D;)p[C[F]]=p[q]}function b(e,i){var p=d.highlight,o;if(typeof e!="string")throw new Error("Expected `string` for `value`, got `"+e+"`");if(m.util.type(i)==="Object")o=i,i=null;else{if(typeof i!="string")throw new Error("Expected `string` for `name`, got `"+i+"`");if(A.call(m.languages,i))o=m.languages[i];else throw new Error("Unknown language: `"+i+"` is not registered")}return p.call(this,e,o,i)}function y(e){if(typeof e!="string")throw new Error("Expected `string` for `language`, got `"+e+"`");return A.call(m.languages,e)}function x(){var e=m.languages,i=[],p;for(p in e)A.call(e,p)&&typeof e[p]=="object"&&i.push(p);return i}function P(e,i,p){var o;return typeof e=="string"?{type:"text",value:e}:m.util.type(e)==="Array"?t(e,i):(o={type:e.type,content:m.Token.stringify(e.content,i,p),tag:"span",classes:["token",e.type],attributes:{},language:i,parent:p},e.alias&&(o.classes=o.classes.concat(e.alias)),m.hooks.run("wrap",o),u(o.tag+"."+o.classes.join("."),c(o.attributes),o.content))}function t(e,i){for(var p=[],o=e.length,q=-1,C;++q<o;)C=e[q],C!==""&&C!==null&&C!==void 0&&p.push(C);for(q=-1,o=p.length;++q<o;)C=p[q],p[q]=m.Token.stringify(C,i,p);return p}function n(e){return e}function c(e){var i;for(i in e)e[i]=r(e[i]);return e}function s(){var e="Prism"in l,i=e?l.Prism:void 0;return p;function p(){e?l.Prism=i:delete l.Prism,e=void 0,i=void 0}}return Ze}var $r=Ct();const St=Gr($r),kt=Qr({__proto__:null,default:St},[$r]);export{kt as c};
//# sourceMappingURL=core-DeAbUyP1.js.map
