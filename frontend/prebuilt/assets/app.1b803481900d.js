/*! React 18.2.0 / ReactDOM / Scheduler: MIT, Facebook, Inc. and affiliates. See THIRD_PARTY_NOTICES.txt. */
(()=>{
const __vendor={"7463":(e,n)=>{function t(e,n){var t=e.length;e.push(n);e:for(;0<t;){var r=t-1>>>1,l=e[r];if(0<a(l,n))e[r]=n,e[t]=l,t=r;else break e}}function r(e){return 0===e.length?null:e[0]}function l(e){if(0===e.length)return null;var n=e[0],t=e.pop();if(t!==n){e[0]=t;e:for(var r=0,l=e.length,u=l>>>1;r<u;){var i=2*(r+1)-1,o=e[i],s=i+1,c=e[s];if(0>a(o,t))s<l&&0>a(c,o)?(e[r]=c,e[s]=t,r=s):(e[r]=o,e[i]=t,r=i);else if(s<l&&0>a(c,t))e[r]=c,e[s]=t,r=s;else break e}}return n}function a(e,n){var t=e.sortIndex-n.sortIndex;return 0!==t?t:e.id-n.id}if("object"===typeof performance&&"function"===typeof performance.now){var u=performance;n.unstable_now=function(){return u.now()}}else{var i=Date,o=i.now();n.unstable_now=function(){return i.now()-o}}var s=[],c=[],f=1,d=null,p=3,m=!1,h=!1,g=!1,v="function"===typeof setTimeout?setTimeout:null,y="function"===typeof clearTimeout?clearTimeout:null,b="undefined"!==typeof setImmediate?setImmediate:null;"undefined"!==typeof navigator&&void 0!==navigator.scheduling&&void 0!==navigator.scheduling.isInputPending&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function k(e){for(var n=r(c);null!==n;){if(null===n.callback)l(c);else if(n.startTime<=e)l(c),n.sortIndex=n.expirationTime,t(s,n);else break;n=r(c)}}function w(e){g=!1;k(e);if(!h)if(null!==r(s))h=!0,F(S);else{var n=r(c);null!==n&&D(w,n.startTime-e)}}function S(e,t){h=!1;g&&(g=!1,y(C),C=-1);m=!0;var a=p;try{k(t);for(d=r(s);null!==d&&(!(d.expirationTime>t)||e&&!z());){var u=d.callback;if("function"===typeof u){d.callback=null;p=d.priorityLevel;var i=u(d.expirationTime<=t);t=n.unstable_now();"function"===typeof i?d.callback=i:d===r(s)&&l(s);k(t)}else l(s);d=r(s)}if(null!==d)var o=!0;else{var f=r(c);null!==f&&D(w,f.startTime-t);o=!1}return o}finally{d=null,p=a,m=!1}}var x=!1,E=null,C=-1,_=5,N=-1;function z(){return n.unstable_now()-N<_?!1:!0}function P(){if(null!==E){var e=n.unstable_now();N=e;var t=!0;try{t=E(!0,e)}finally{t?T():(x=!1,E=null)}}else x=!1}var T;if("function"===typeof b)T=function(){b(P)};else if("undefined"!==typeof MessageChannel){var L=new MessageChannel,M=L.port2;L.port1.onmessage=P;T=function(){M.postMessage(null)}}else T=function(){v(P,0)};function F(e){E=e;x||(x=!0,T())}function D(e,t){C=v((function(){e(n.unstable_now())}),t)}n.unstable_IdlePriority=5;n.unstable_ImmediatePriority=1;n.unstable_LowPriority=4;n.unstable_NormalPriority=3;n.unstable_Profiling=null;n.unstable_UserBlockingPriority=2;n.unstable_cancelCallback=function(e){e.callback=null};n.unstable_continueExecution=function(){h||m||(h=!0,F(S))};n.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):_=0<e?Math.floor(1e3/e):5};n.unstable_getCurrentPriorityLevel=function(){return p};n.unstable_getFirstCallbackNode=function(){return r(s)};n.unstable_next=function(e){switch(p){case 1:case 2:case 3:var n=3;break;default:n=p}var t=p;p=n;try{return e()}finally{p=t}};n.unstable_pauseExecution=function(){};n.unstable_requestPaint=function(){};n.unstable_runWithPriority=function(e,n){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var t=p;p=e;try{return n()}finally{p=t}};n.unstable_scheduleCallback=function(e,l,a){var u=n.unstable_now();"object"===typeof a&&null!==a?(a=a.delay,a="number"===typeof a&&0<a?u+a:u):a=u;switch(e){case 1:var i=-1;break;case 2:i=250;break;case 5:i=1073741823;break;case 4:i=1e4;break;default:i=5e3}i=a+i;e={id:f++,callback:l,priorityLevel:e,startTime:a,expirationTime:i,sortIndex:-1};a>u?(e.sortIndex=a,t(c,e),null===r(s)&&e===r(c)&&(g?(y(C),C=-1):g=!0,D(w,a-u))):(e.sortIndex=i,t(s,e),h||m||(h=!0,F(S)));return e};n.unstable_shouldYield=z;n.unstable_wrapCallback=function(e){var n=p;return function(){var t=p;p=n;try{return e.apply(this,arguments)}finally{p=t}}}},"15287":(e,t)=>{var r=Symbol.for("react.element"),n=Symbol.for("react.portal"),o=Symbol.for("react.fragment"),u=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),c=Symbol.for("react.provider"),i=Symbol.for("react.context"),f=Symbol.for("react.forward_ref"),l=Symbol.for("react.suspense"),s=Symbol.for("react.memo"),p=Symbol.for("react.lazy"),y=Symbol.iterator;function d(e){if(null===e||"object"!==typeof e)return null;e=y&&e[y]||e["@@iterator"];return"function"===typeof e?e:null}var _={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},h=Object.assign,b={};function m(e,t,r){this.props=e;this.context=t;this.refs=b;this.updater=r||_}m.prototype.isReactComponent={};m.prototype.setState=function(e,t){if("object"!==typeof e&&"function"!==typeof e&&null!=e)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};m.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function v(){}v.prototype=m.prototype;function S(e,t,r){this.props=e;this.context=t;this.refs=b;this.updater=r||_}var k=S.prototype=new v;k.constructor=S;h(k,m.prototype);k.isPureReactComponent=!0;var w=Array.isArray,E=Object.prototype.hasOwnProperty,$={current:null},R={key:!0,ref:!0,__self:!0,__source:!0};function C(e,t,n){var o,u={},a=null,c=null;if(null!=t)for(o in void 0!==t.ref&&(c=t.ref),void 0!==t.key&&(a=""+t.key),t)E.call(t,o)&&!R.hasOwnProperty(o)&&(u[o]=t[o]);var i=arguments.length-2;if(1===i)u.children=n;else if(1<i){for(var f=Array(i),l=0;l<i;l++)f[l]=arguments[l+2];u.children=f}if(e&&e.defaultProps)for(o in i=e.defaultProps,i)void 0===u[o]&&(u[o]=i[o]);return{$$typeof:r,type:e,key:a,ref:c,props:u,_owner:$.current}}function j(e,t){return{$$typeof:r,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function g(e){return"object"===typeof e&&null!==e&&e.$$typeof===r}function O(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,(function(e){return t[e]}))}var x=/\/+/g;function P(e,t){return"object"===typeof e&&null!==e&&null!=e.key?O(""+e.key):t.toString(36)}function I(e,t,o,u,a){var c=typeof e;if("undefined"===c||"boolean"===c)e=null;var i=!1;if(null===e)i=!0;else switch(c){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case r:case n:i=!0}}if(i)return i=e,a=a(i),e=""===u?"."+P(i,0):u,w(a)?(o="",null!=e&&(o=e.replace(x,"$&/")+"/"),I(a,t,o,"",(function(e){return e}))):null!=a&&(g(a)&&(a=j(a,o+(!a.key||i&&i.key===a.key?"":(""+a.key).replace(x,"$&/")+"/")+e)),t.push(a)),1;i=0;u=""===u?".":u+":";if(w(e))for(var f=0;f<e.length;f++){c=e[f];var l=u+P(c,f);i+=I(c,t,o,l,a)}else if(l=d(e),"function"===typeof l)for(e=l.call(e),f=0;!(c=e.next()).done;)c=c.value,l=u+P(c,f++),i+=I(c,t,o,l,a);else if("object"===c)throw t=String(e),Error("Objects are not valid as a React child (found: "+("[object Object]"===t?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return i}function T(e,t,r){if(null==e)return e;var n=[],o=0;I(e,n,"","",(function(e){return t.call(r,e,o++)}));return n}function V(e){if(-1===e._status){var t=e._result;t=t();t.then((function(t){if(0===e._status||-1===e._status)e._status=1,e._result=t}),(function(t){if(0===e._status||-1===e._status)e._status=2,e._result=t}));-1===e._status&&(e._status=0,e._result=t)}if(1===e._status)return e._result.default;throw e._result}var A={current:null},D={transition:null},U={ReactCurrentDispatcher:A,ReactCurrentBatchConfig:D,ReactCurrentOwner:$};t.Children={map:T,forEach:function(e,t,r){T(e,(function(){t.apply(this,arguments)}),r)},count:function(e){var t=0;T(e,(function(){t++}));return t},toArray:function(e){return T(e,(function(e){return e}))||[]},only:function(e){if(!g(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};t.Component=m;t.Fragment=o;t.Profiler=a;t.PureComponent=S;t.StrictMode=u;t.Suspense=l;t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=U;t.cloneElement=function(e,t,n){if(null===e||void 0===e)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var o=h({},e.props),u=e.key,a=e.ref,c=e._owner;if(null!=t){void 0!==t.ref&&(a=t.ref,c=$.current);void 0!==t.key&&(u=""+t.key);if(e.type&&e.type.defaultProps)var i=e.type.defaultProps;for(f in t)E.call(t,f)&&!R.hasOwnProperty(f)&&(o[f]=void 0===t[f]&&void 0!==i?i[f]:t[f])}var f=arguments.length-2;if(1===f)o.children=n;else if(1<f){i=Array(f);for(var l=0;l<f;l++)i[l]=arguments[l+2];o.children=i}return{$$typeof:r,type:e.type,key:u,ref:a,props:o,_owner:c}};t.createContext=function(e){e={$$typeof:i,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null};e.Provider={$$typeof:c,_context:e};return e.Consumer=e};t.createElement=C;t.createFactory=function(e){var t=C.bind(null,e);t.type=e;return t};t.createRef=function(){return{current:null}};t.forwardRef=function(e){return{$$typeof:f,render:e}};t.isValidElement=g;t.lazy=function(e){return{$$typeof:p,_payload:{_status:-1,_result:e},_init:V}};t.memo=function(e,t){return{$$typeof:s,type:e,compare:void 0===t?null:t}};t.startTransition=function(e){var t=D.transition;D.transition={};try{e()}finally{D.transition=t}};t.unstable_act=function(){throw Error("act(...) is not supported in production builds of React.")};t.useCallback=function(e,t){return A.current.useCallback(e,t)};t.useContext=function(e){return A.current.useContext(e)};t.useDebugValue=function(){};t.useDeferredValue=function(e){return A.current.useDeferredValue(e)};t.useEffect=function(e,t){return A.current.useEffect(e,t)};t.useId=function(){return A.current.useId()};t.useImperativeHandle=function(e,t,r){return A.current.useImperativeHandle(e,t,r)};t.useInsertionEffect=function(e,t){return A.current.useInsertionEffect(e,t)};t.useLayoutEffect=function(e,t){return A.current.useLayoutEffect(e,t)};t.useMemo=function(e,t){return A.current.useMemo(e,t)};t.useReducer=function(e,t,r){return A.current.useReducer(e,t,r)};t.useRef=function(e){return A.current.useRef(e)};t.useState=function(e){return A.current.useState(e)};t.useSyncExternalStore=function(e,t,r){return A.current.useSyncExternalStore(e,t,r)};t.useTransition=function(){return A.current.useTransition()};t.version="18.2.0"},"22551":(e,n,t)=>{var r=t(44914),l=t(69982);function a(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,t=1;t<arguments.length;t++)n+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var u=new Set,i={};function o(e,n){s(e,n);s(e+"Capture",n)}function s(e,n){i[e]=n;for(e=0;e<n.length;e++)u.add(n[e])}var c=!("undefined"===typeof window||"undefined"===typeof window.document||"undefined"===typeof window.document.createElement),f=Object.prototype.hasOwnProperty,d=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,p={},m={};function h(e){if(f.call(m,e))return!0;if(f.call(p,e))return!1;if(d.test(e))return m[e]=!0;p[e]=!0;return!1}function g(e,n,t,r){if(null!==t&&0===t.type)return!1;switch(typeof n){case"function":case"symbol":return!0;case"boolean":if(r)return!1;if(null!==t)return!t.acceptsBooleans;e=e.toLowerCase().slice(0,5);return"data-"!==e&&"aria-"!==e;default:return!1}}function v(e,n,t,r){if(null===n||"undefined"===typeof n||g(e,n,t,r))return!0;if(r)return!1;if(null!==t)switch(t.type){case 3:return!n;case 4:return!1===n;case 5:return isNaN(n);case 6:return isNaN(n)||1>n}return!1}function y(e,n,t,r,l,a,u){this.acceptsBooleans=2===n||3===n||4===n;this.attributeName=r;this.attributeNamespace=l;this.mustUseProperty=t;this.propertyName=e;this.type=n;this.sanitizeURL=a;this.removeEmptyString=u}var b={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach((function(e){b[e]=new y(e,0,!1,e,null,!1,!1)}));[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach((function(e){var n=e[0];b[n]=new y(n,1,!1,e[1],null,!1,!1)}));["contentEditable","draggable","spellCheck","value"].forEach((function(e){b[e]=new y(e,2,!1,e.toLowerCase(),null,!1,!1)}));["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach((function(e){b[e]=new y(e,2,!1,e,null,!1,!1)}));"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach((function(e){b[e]=new y(e,3,!1,e.toLowerCase(),null,!1,!1)}));["checked","multiple","muted","selected"].forEach((function(e){b[e]=new y(e,3,!0,e,null,!1,!1)}));["capture","download"].forEach((function(e){b[e]=new y(e,4,!1,e,null,!1,!1)}));["cols","rows","size","span"].forEach((function(e){b[e]=new y(e,6,!1,e,null,!1,!1)}));["rowSpan","start"].forEach((function(e){b[e]=new y(e,5,!1,e.toLowerCase(),null,!1,!1)}));var k=/[\-:]([a-z])/g;function w(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach((function(e){var n=e.replace(k,w);b[n]=new y(n,1,!1,e,null,!1,!1)}));"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach((function(e){var n=e.replace(k,w);b[n]=new y(n,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)}));["xml:base","xml:lang","xml:space"].forEach((function(e){var n=e.replace(k,w);b[n]=new y(n,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)}));["tabIndex","crossOrigin"].forEach((function(e){b[e]=new y(e,1,!1,e.toLowerCase(),null,!1,!1)}));b.xlinkHref=new y("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach((function(e){b[e]=new y(e,1,!1,e.toLowerCase(),null,!0,!0)}));function S(e,n,t,r){var l=b.hasOwnProperty(n)?b[n]:null;if(null!==l?0!==l.type:r||!(2<n.length)||"o"!==n[0]&&"O"!==n[0]||"n"!==n[1]&&"N"!==n[1])v(n,t,l,r)&&(t=null),r||null===l?h(n)&&(null===t?e.removeAttribute(n):e.setAttribute(n,""+t)):l.mustUseProperty?e[l.propertyName]=null===t?3===l.type?!1:"":t:(n=l.attributeName,r=l.attributeNamespace,null===t?e.removeAttribute(n):(l=l.type,t=3===l||4===l&&!0===t?"":""+t,r?e.setAttributeNS(r,n,t):e.setAttribute(n,t)))}var x=r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,E=Symbol.for("react.element"),C=Symbol.for("react.portal"),_=Symbol.for("react.fragment"),N=Symbol.for("react.strict_mode"),z=Symbol.for("react.profiler"),P=Symbol.for("react.provider"),T=Symbol.for("react.context"),L=Symbol.for("react.forward_ref"),M=Symbol.for("react.suspense"),F=Symbol.for("react.suspense_list"),D=Symbol.for("react.memo"),R=Symbol.for("react.lazy");Symbol.for("react.scope");Symbol.for("react.debug_trace_mode");var O=Symbol.for("react.offscreen");Symbol.for("react.legacy_hidden");Symbol.for("react.cache");Symbol.for("react.tracing_marker");var I=Symbol.iterator;function U(e){if(null===e||"object"!==typeof e)return null;e=I&&e[I]||e["@@iterator"];return"function"===typeof e?e:null}var V=Object.assign,A;function B(e){if(void 0===A)try{throw Error()}catch(t){var n=t.stack.trim().match(/\n( *(at )?)/);A=n&&n[1]||""}return"\n"+A+e}var H=!1;function W(e,n){if(!e||H)return"";H=!0;var t=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(n)if(n=function(){throw Error()},Object.defineProperty(n.prototype,"props",{set:function(){throw Error()}}),"object"===typeof Reflect&&Reflect.construct){try{Reflect.construct(n,[])}catch(s){var r=s}Reflect.construct(e,[],n)}else{try{n.call()}catch(s){r=s}e.call(n.prototype)}else{try{throw Error()}catch(s){r=s}e()}}catch(s){if(s&&r&&"string"===typeof s.stack){for(var l=s.stack.split("\n"),a=r.stack.split("\n"),u=l.length-1,i=a.length-1;1<=u&&0<=i&&l[u]!==a[i];)i--;for(;1<=u&&0<=i;u--,i--)if(l[u]!==a[i]){if(1!==u||1!==i){do{if(u--,i--,0>i||l[u]!==a[i]){var o="\n"+l[u].replace(" at new "," at ");e.displayName&&o.includes("<anonymous>")&&(o=o.replace("<anonymous>",e.displayName));return o}}while(1<=u&&0<=i)}break}}}finally{H=!1,Error.prepareStackTrace=t}return(e=e?e.displayName||e.name:"")?B(e):""}function Q(e){switch(e.tag){case 5:return B(e.type);case 16:return B("Lazy");case 13:return B("Suspense");case 19:return B("SuspenseList");case 0:case 2:case 15:return e=W(e.type,!1),e;case 11:return e=W(e.type.render,!1),e;case 1:return e=W(e.type,!0),e;default:return""}}function j(e){if(null==e)return null;if("function"===typeof e)return e.displayName||e.name||null;if("string"===typeof e)return e;switch(e){case _:return"Fragment";case C:return"Portal";case z:return"Profiler";case N:return"StrictMode";case M:return"Suspense";case F:return"SuspenseList"}if("object"===typeof e)switch(e.$$typeof){case T:return(e.displayName||"Context")+".Consumer";case P:return(e._context.displayName||"Context")+".Provider";case L:var n=e.render;e=e.displayName;e||(e=n.displayName||n.name||"",e=""!==e?"ForwardRef("+e+")":"ForwardRef");return e;case D:return n=e.displayName||null,null!==n?n:j(e.type)||"Memo";case R:n=e._payload;e=e._init;try{return j(e(n))}catch(t){}}return null}function $(e){var n=e.type;switch(e.tag){case 24:return"Cache";case 9:return(n.displayName||"Context")+".Consumer";case 10:return(n._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=n.render,e=e.displayName||e.name||"",n.displayName||(""!==e?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return n;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return j(n);case 8:return n===N?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if("function"===typeof n)return n.displayName||n.name||null;if("string"===typeof n)return n}return null}function K(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function q(e){var n=e.type;return(e=e.nodeName)&&"input"===e.toLowerCase()&&("checkbox"===n||"radio"===n)}function Y(e){var n=q(e)?"checked":"value",t=Object.getOwnPropertyDescriptor(e.constructor.prototype,n),r=""+e[n];if(!e.hasOwnProperty(n)&&"undefined"!==typeof t&&"function"===typeof t.get&&"function"===typeof t.set){var l=t.get,a=t.set;Object.defineProperty(e,n,{configurable:!0,get:function(){return l.call(this)},set:function(e){r=""+e;a.call(this,e)}});Object.defineProperty(e,n,{enumerable:t.enumerable});return{getValue:function(){return r},setValue:function(e){r=""+e},stopTracking:function(){e._valueTracker=null;delete e[n]}}}}function X(e){e._valueTracker||(e._valueTracker=Y(e))}function G(e){if(!e)return!1;var n=e._valueTracker;if(!n)return!0;var t=n.getValue();var r="";e&&(r=q(e)?e.checked?"true":"false":e.value);e=r;return e!==t?(n.setValue(e),!0):!1}function Z(e){e=e||("undefined"!==typeof document?document:void 0);if("undefined"===typeof e)return null;try{return e.activeElement||e.body}catch(n){return e.body}}function J(e,n){var t=n.checked;return V({},n,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:null!=t?t:e._wrapperState.initialChecked})}function ee(e,n){var t=null==n.defaultValue?"":n.defaultValue,r=null!=n.checked?n.checked:n.defaultChecked;t=K(null!=n.value?n.value:t);e._wrapperState={initialChecked:r,initialValue:t,controlled:"checkbox"===n.type||"radio"===n.type?null!=n.checked:null!=n.value}}function ne(e,n){n=n.checked;null!=n&&S(e,"checked",n,!1)}function te(e,n){ne(e,n);var t=K(n.value),r=n.type;if(null!=t)if("number"===r){if(0===t&&""===e.value||e.value!=t)e.value=""+t}else e.value!==""+t&&(e.value=""+t);else if("submit"===r||"reset"===r){e.removeAttribute("value");return}n.hasOwnProperty("value")?le(e,n.type,t):n.hasOwnProperty("defaultValue")&&le(e,n.type,K(n.defaultValue));null==n.checked&&null!=n.defaultChecked&&(e.defaultChecked=!!n.defaultChecked)}function re(e,n,t){if(n.hasOwnProperty("value")||n.hasOwnProperty("defaultValue")){var r=n.type;if(!("submit"!==r&&"reset"!==r||void 0!==n.value&&null!==n.value))return;n=""+e._wrapperState.initialValue;t||n===e.value||(e.value=n);e.defaultValue=n}t=e.name;""!==t&&(e.name="");e.defaultChecked=!!e._wrapperState.initialChecked;""!==t&&(e.name=t)}function le(e,n,t){if("number"!==n||Z(e.ownerDocument)!==e)null==t?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+t&&(e.defaultValue=""+t)}var ae=Array.isArray;function ue(e,n,t,r){e=e.options;if(n){n={};for(var l=0;l<t.length;l++)n["$"+t[l]]=!0;for(t=0;t<e.length;t++)l=n.hasOwnProperty("$"+e[t].value),e[t].selected!==l&&(e[t].selected=l),l&&r&&(e[t].defaultSelected=!0)}else{t=""+K(t);n=null;for(l=0;l<e.length;l++){if(e[l].value===t){e[l].selected=!0;r&&(e[l].defaultSelected=!0);return}null!==n||e[l].disabled||(n=e[l])}null!==n&&(n.selected=!0)}}function ie(e,n){if(null!=n.dangerouslySetInnerHTML)throw Error(a(91));return V({},n,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function oe(e,n){var t=n.value;if(null==t){t=n.children;n=n.defaultValue;if(null!=t){if(null!=n)throw Error(a(92));if(ae(t)){if(1<t.length)throw Error(a(93));t=t[0]}n=t}null==n&&(n="");t=n}e._wrapperState={initialValue:K(t)}}function se(e,n){var t=K(n.value),r=K(n.defaultValue);null!=t&&(t=""+t,t!==e.value&&(e.value=t),null==n.defaultValue&&e.defaultValue!==t&&(e.defaultValue=t));null!=r&&(e.defaultValue=""+r)}function ce(e){var n=e.textContent;n===e._wrapperState.initialValue&&""!==n&&null!==n&&(e.value=n)}function fe(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function de(e,n){return null==e||"http://www.w3.org/1999/xhtml"===e?fe(n):"http://www.w3.org/2000/svg"===e&&"foreignObject"===n?"http://www.w3.org/1999/xhtml":e}var pe,me=function(e){return"undefined"!==typeof MSApp&&MSApp.execUnsafeLocalFunction?function(n,t,r,l){MSApp.execUnsafeLocalFunction((function(){return e(n,t,r,l)}))}:e}((function(e,n){if("http://www.w3.org/2000/svg"!==e.namespaceURI||"innerHTML"in e)e.innerHTML=n;else{pe=pe||document.createElement("div");pe.innerHTML="<svg>"+n.valueOf().toString()+"</svg>";for(n=pe.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;n.firstChild;)e.appendChild(n.firstChild)}}));function he(e,n){if(n){var t=e.firstChild;if(t&&t===e.lastChild&&3===t.nodeType){t.nodeValue=n;return}}e.textContent=n}var ge={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},ve=["Webkit","ms","Moz","O"];Object.keys(ge).forEach((function(e){ve.forEach((function(n){n=n+e.charAt(0).toUpperCase()+e.substring(1);ge[n]=ge[e]}))}));function ye(e,n,t){return null==n||"boolean"===typeof n||""===n?"":t||"number"!==typeof n||0===n||ge.hasOwnProperty(e)&&ge[e]?(""+n).trim():n+"px"}function be(e,n){e=e.style;for(var t in n)if(n.hasOwnProperty(t)){var r=0===t.indexOf("--"),l=ye(t,n[t],r);"float"===t&&(t="cssFloat");r?e.setProperty(t,l):e[t]=l}}var ke=V({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function we(e,n){if(n){if(ke[e]&&(null!=n.children||null!=n.dangerouslySetInnerHTML))throw Error(a(137,e));if(null!=n.dangerouslySetInnerHTML){if(null!=n.children)throw Error(a(60));if("object"!==typeof n.dangerouslySetInnerHTML||!("__html"in n.dangerouslySetInnerHTML))throw Error(a(61))}if(null!=n.style&&"object"!==typeof n.style)throw Error(a(62))}}function Se(e,n){if(-1===e.indexOf("-"))return"string"===typeof n.is;switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var xe=null;function Ee(e){e=e.target||e.srcElement||window;e.correspondingUseElement&&(e=e.correspondingUseElement);return 3===e.nodeType?e.parentNode:e}var Ce=null,_e=null,Ne=null;function ze(e){if(e=Bl(e)){if("function"!==typeof Ce)throw Error(a(280));var n=e.stateNode;n&&(n=Wl(n),Ce(e.stateNode,e.type,n))}}function Pe(e){_e?Ne?Ne.push(e):Ne=[e]:_e=e}function Te(){if(_e){var e=_e,n=Ne;Ne=_e=null;ze(e);if(n)for(e=0;e<n.length;e++)ze(n[e])}}function Le(e,n){return e(n)}function Me(){}var Fe=!1;function De(e,n,t){if(Fe)return e(n,t);Fe=!0;try{return Le(e,n,t)}finally{if(Fe=!1,null!==_e||null!==Ne)Me(),Te()}}function Re(e,n){var t=e.stateNode;if(null===t)return null;var r=Wl(t);if(null===r)return null;t=r[n];e:switch(n){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(e=e.type,r=!("button"===e||"input"===e||"select"===e||"textarea"===e));e=!r;break e;default:e=!1}if(e)return null;if(t&&"function"!==typeof t)throw Error(a(231,n,typeof t));return t}var Oe=!1;if(c)try{var Ie={};Object.defineProperty(Ie,"passive",{get:function(){Oe=!0}});window.addEventListener("test",Ie,Ie);window.removeEventListener("test",Ie,Ie)}catch(Ic){Oe=!1}function Ue(e,n,t,r,l,a,u,i,o){var s=Array.prototype.slice.call(arguments,3);try{n.apply(t,s)}catch(c){this.onError(c)}}var Ve=!1,Ae=null,Be=!1,He=null,We={onError:function(e){Ve=!0;Ae=e}};function Qe(e,n,t,r,l,a,u,i,o){Ve=!1;Ae=null;Ue.apply(We,arguments)}function je(e,n,t,r,l,u,i,o,s){Qe.apply(this,arguments);if(Ve){if(Ve){var c=Ae;Ve=!1;Ae=null}else throw Error(a(198));Be||(Be=!0,He=c)}}function $e(e){var n=e,t=e;if(e.alternate)for(;n.return;)n=n.return;else{e=n;do{n=e,0!==(n.flags&4098)&&(t=n.return),e=n.return}while(e)}return 3===n.tag?t:null}function Ke(e){if(13===e.tag){var n=e.memoizedState;null===n&&(e=e.alternate,null!==e&&(n=e.memoizedState));if(null!==n)return n.dehydrated}return null}function qe(e){if($e(e)!==e)throw Error(a(188))}function Ye(e){var n=e.alternate;if(!n){n=$e(e);if(null===n)throw Error(a(188));return n!==e?null:e}for(var t=e,r=n;;){var l=t.return;if(null===l)break;var u=l.alternate;if(null===u){r=l.return;if(null!==r){t=r;continue}break}if(l.child===u.child){for(u=l.child;u;){if(u===t)return qe(l),e;if(u===r)return qe(l),n;u=u.sibling}throw Error(a(188))}if(t.return!==r.return)t=l,r=u;else{for(var i=!1,o=l.child;o;){if(o===t){i=!0;t=l;r=u;break}if(o===r){i=!0;r=l;t=u;break}o=o.sibling}if(!i){for(o=u.child;o;){if(o===t){i=!0;t=u;r=l;break}if(o===r){i=!0;r=u;t=l;break}o=o.sibling}if(!i)throw Error(a(189))}}if(t.alternate!==r)throw Error(a(190))}if(3!==t.tag)throw Error(a(188));return t.stateNode.current===t?e:n}function Xe(e){e=Ye(e);return null!==e?Ge(e):null}function Ge(e){if(5===e.tag||6===e.tag)return e;for(e=e.child;null!==e;){var n=Ge(e);if(null!==n)return n;e=e.sibling}return null}var Ze=l.unstable_scheduleCallback,Je=l.unstable_cancelCallback,en=l.unstable_shouldYield,nn=l.unstable_requestPaint,tn=l.unstable_now,rn=l.unstable_getCurrentPriorityLevel,ln=l.unstable_ImmediatePriority,an=l.unstable_UserBlockingPriority,un=l.unstable_NormalPriority,on=l.unstable_LowPriority,sn=l.unstable_IdlePriority,cn=null,fn=null;function dn(e){if(fn&&"function"===typeof fn.onCommitFiberRoot)try{fn.onCommitFiberRoot(cn,e,void 0,128===(e.current.flags&128))}catch(n){}}var pn=Math.clz32?Math.clz32:gn,mn=Math.log,hn=Math.LN2;function gn(e){e>>>=0;return 0===e?32:31-(mn(e)/hn|0)|0}var vn=64,yn=4194304;function bn(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function kn(e,n){var t=e.pendingLanes;if(0===t)return 0;var r=0,l=e.suspendedLanes,a=e.pingedLanes,u=t&268435455;if(0!==u){var i=u&~l;0!==i?r=bn(i):(a&=u,0!==a&&(r=bn(a)))}else u=t&~l,0!==u?r=bn(u):0!==a&&(r=bn(a));if(0===r)return 0;if(0!==n&&n!==r&&0===(n&l)&&(l=r&-r,a=n&-n,l>=a||16===l&&0!==(a&4194240)))return n;0!==(r&4)&&(r|=t&16);n=e.entangledLanes;if(0!==n)for(e=e.entanglements,n&=r;0<n;)t=31-pn(n),l=1<<t,r|=e[t],n&=~l;return r}function wn(e,n){switch(e){case 1:case 2:case 4:return n+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Sn(e,n){for(var t=e.suspendedLanes,r=e.pingedLanes,l=e.expirationTimes,a=e.pendingLanes;0<a;){var u=31-pn(a),i=1<<u,o=l[u];if(-1===o){if(0===(i&t)||0!==(i&r))l[u]=wn(i,n)}else o<=n&&(e.expiredLanes|=i);a&=~i}}function xn(e){e=e.pendingLanes&-1073741825;return 0!==e?e:e&1073741824?1073741824:0}function En(){var e=vn;vn<<=1;0===(vn&4194240)&&(vn=64);return e}function Cn(e){for(var n=[],t=0;31>t;t++)n.push(e);return n}function _n(e,n,t){e.pendingLanes|=n;536870912!==n&&(e.suspendedLanes=0,e.pingedLanes=0);e=e.eventTimes;n=31-pn(n);e[n]=t}function Nn(e,n){var t=e.pendingLanes&~n;e.pendingLanes=n;e.suspendedLanes=0;e.pingedLanes=0;e.expiredLanes&=n;e.mutableReadLanes&=n;e.entangledLanes&=n;n=e.entanglements;var r=e.eventTimes;for(e=e.expirationTimes;0<t;){var l=31-pn(t),a=1<<l;n[l]=0;r[l]=-1;e[l]=-1;t&=~a}}function zn(e,n){var t=e.entangledLanes|=n;for(e=e.entanglements;t;){var r=31-pn(t),l=1<<r;l&n|e[r]&n&&(e[r]|=n);t&=~l}}var Pn=0;function Tn(e){e&=-e;return 1<e?4<e?0!==(e&268435455)?16:536870912:4:1}var Ln,Mn,Fn,Dn,Rn,On=!1,In=[],Un=null,Vn=null,An=null,Bn=new Map,Hn=new Map,Wn=[],Qn="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function jn(e,n){switch(e){case"focusin":case"focusout":Un=null;break;case"dragenter":case"dragleave":Vn=null;break;case"mouseover":case"mouseout":An=null;break;case"pointerover":case"pointerout":Bn.delete(n.pointerId);break;case"gotpointercapture":case"lostpointercapture":Hn.delete(n.pointerId)}}function $n(e,n,t,r,l,a){if(null===e||e.nativeEvent!==a)return e={blockedOn:n,domEventName:t,eventSystemFlags:r,nativeEvent:a,targetContainers:[l]},null!==n&&(n=Bl(n),null!==n&&Mn(n)),e;e.eventSystemFlags|=r;n=e.targetContainers;null!==l&&-1===n.indexOf(l)&&n.push(l);return e}function Kn(e,n,t,r,l){switch(n){case"focusin":return Un=$n(Un,e,n,t,r,l),!0;case"dragenter":return Vn=$n(Vn,e,n,t,r,l),!0;case"mouseover":return An=$n(An,e,n,t,r,l),!0;case"pointerover":var a=l.pointerId;Bn.set(a,$n(Bn.get(a)||null,e,n,t,r,l));return!0;case"gotpointercapture":return a=l.pointerId,Hn.set(a,$n(Hn.get(a)||null,e,n,t,r,l)),!0}return!1}function qn(e){var n=Al(e.target);if(null!==n){var t=$e(n);if(null!==t)if(n=t.tag,13===n){if(n=Ke(t),null!==n){e.blockedOn=n;Rn(e.priority,(function(){Fn(t)}));return}}else if(3===n&&t.stateNode.current.memoizedState.isDehydrated){e.blockedOn=3===t.tag?t.stateNode.containerInfo:null;return}}e.blockedOn=null}function Yn(e){if(null!==e.blockedOn)return!1;for(var n=e.targetContainers;0<n.length;){var t=ut(e.domEventName,e.eventSystemFlags,n[0],e.nativeEvent);if(null===t){t=e.nativeEvent;var r=new t.constructor(t.type,t);xe=r;t.target.dispatchEvent(r);xe=null}else return n=Bl(t),null!==n&&Mn(n),e.blockedOn=t,!1;n.shift()}return!0}function Xn(e,n,t){Yn(e)&&t.delete(n)}function Gn(){On=!1;null!==Un&&Yn(Un)&&(Un=null);null!==Vn&&Yn(Vn)&&(Vn=null);null!==An&&Yn(An)&&(An=null);Bn.forEach(Xn);Hn.forEach(Xn)}function Zn(e,n){e.blockedOn===n&&(e.blockedOn=null,On||(On=!0,l.unstable_scheduleCallback(l.unstable_NormalPriority,Gn)))}function Jn(e){function n(n){return Zn(n,e)}if(0<In.length){Zn(In[0],e);for(var t=1;t<In.length;t++){var r=In[t];r.blockedOn===e&&(r.blockedOn=null)}}null!==Un&&Zn(Un,e);null!==Vn&&Zn(Vn,e);null!==An&&Zn(An,e);Bn.forEach(n);Hn.forEach(n);for(t=0;t<Wn.length;t++)r=Wn[t],r.blockedOn===e&&(r.blockedOn=null);for(;0<Wn.length&&(t=Wn[0],null===t.blockedOn);)qn(t),null===t.blockedOn&&Wn.shift()}var et=x.ReactCurrentBatchConfig,nt=!0;function tt(e,n,t,r){var l=Pn,a=et.transition;et.transition=null;try{Pn=1,lt(e,n,t,r)}finally{Pn=l,et.transition=a}}function rt(e,n,t,r){var l=Pn,a=et.transition;et.transition=null;try{Pn=4,lt(e,n,t,r)}finally{Pn=l,et.transition=a}}function lt(e,n,t,r){if(nt){var l=ut(e,n,t,r);if(null===l)dl(e,n,r,at,t),jn(e,r);else if(Kn(l,e,n,t,r))r.stopPropagation();else if(jn(e,r),n&4&&-1<Qn.indexOf(e)){for(;null!==l;){var a=Bl(l);null!==a&&Ln(a);a=ut(e,n,t,r);null===a&&dl(e,n,r,at,t);if(a===l)break;l=a}null!==l&&r.stopPropagation()}else dl(e,n,r,null,t)}}var at=null;function ut(e,n,t,r){at=null;e=Ee(r);e=Al(e);if(null!==e)if(n=$e(e),null===n)e=null;else if(t=n.tag,13===t){e=Ke(n);if(null!==e)return e;e=null}else if(3===t){if(n.stateNode.current.memoizedState.isDehydrated)return 3===n.tag?n.stateNode.containerInfo:null;e=null}else n!==e&&(e=null);at=e;return null}function it(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(rn()){case ln:return 1;case an:return 4;case un:case on:return 16;case sn:return 536870912;default:return 16}default:return 16}}var ot=null,st=null,ct=null;function ft(){if(ct)return ct;var e,n=st,t=n.length,r,l="value"in ot?ot.value:ot.textContent,a=l.length;for(e=0;e<t&&n[e]===l[e];e++);var u=t-e;for(r=1;r<=u&&n[t-r]===l[a-r];r++);return ct=l.slice(e,1<r?1-r:void 0)}function dt(e){var n=e.keyCode;"charCode"in e?(e=e.charCode,0===e&&13===n&&(e=13)):e=n;10===e&&(e=13);return 32<=e||13===e?e:0}function pt(){return!0}function mt(){return!1}function ht(e){function n(n,t,r,l,a){this._reactName=n;this._targetInst=r;this.type=t;this.nativeEvent=l;this.target=a;this.currentTarget=null;for(var u in e)e.hasOwnProperty(u)&&(n=e[u],this[u]=n?n(l):l[u]);this.isDefaultPrevented=(null!=l.defaultPrevented?l.defaultPrevented:!1===l.returnValue)?pt:mt;this.isPropagationStopped=mt;return this}V(n.prototype,{preventDefault:function(){this.defaultPrevented=!0;var e=this.nativeEvent;e&&(e.preventDefault?e.preventDefault():"unknown"!==typeof e.returnValue&&(e.returnValue=!1),this.isDefaultPrevented=pt)},stopPropagation:function(){var e=this.nativeEvent;e&&(e.stopPropagation?e.stopPropagation():"unknown"!==typeof e.cancelBubble&&(e.cancelBubble=!0),this.isPropagationStopped=pt)},persist:function(){},isPersistent:pt});return n}var gt={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},vt=ht(gt),yt=V({},gt,{view:0,detail:0}),bt=ht(yt),kt,wt,St,xt=V({},yt,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Vt,button:0,buttons:0,relatedTarget:function(e){return void 0===e.relatedTarget?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){if("movementX"in e)return e.movementX;e!==St&&(St&&"mousemove"===e.type?(kt=e.screenX-St.screenX,wt=e.screenY-St.screenY):wt=kt=0,St=e);return kt},movementY:function(e){return"movementY"in e?e.movementY:wt}}),Et=ht(xt),Ct=V({},xt,{dataTransfer:0}),_t=ht(Ct),Nt=V({},yt,{relatedTarget:0}),zt=ht(Nt),Pt=V({},gt,{animationName:0,elapsedTime:0,pseudoElement:0}),Tt=ht(Pt),Lt=V({},gt,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Mt=ht(Lt),Ft=V({},gt,{data:0}),Dt=ht(Ft),Rt={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Ot={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},It={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Ut(e){var n=this.nativeEvent;return n.getModifierState?n.getModifierState(e):(e=It[e])?!!n[e]:!1}function Vt(){return Ut}var At=V({},yt,{key:function(e){if(e.key){var n=Rt[e.key]||e.key;if("Unidentified"!==n)return n}return"keypress"===e.type?(e=dt(e),13===e?"Enter":String.fromCharCode(e)):"keydown"===e.type||"keyup"===e.type?Ot[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Vt,charCode:function(e){return"keypress"===e.type?dt(e):0},keyCode:function(e){return"keydown"===e.type||"keyup"===e.type?e.keyCode:0},which:function(e){return"keypress"===e.type?dt(e):"keydown"===e.type||"keyup"===e.type?e.keyCode:0}}),Bt=ht(At),Ht=V({},xt,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Wt=ht(Ht),Qt=V({},yt,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Vt}),jt=ht(Qt),$t=V({},gt,{propertyName:0,elapsedTime:0,pseudoElement:0}),Kt=ht($t),qt=V({},xt,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Yt=ht(qt),Xt=[9,13,27,32],Gt=c&&"CompositionEvent"in window,Zt=null;c&&"documentMode"in document&&(Zt=document.documentMode);var Jt=c&&"TextEvent"in window&&!Zt,er=c&&(!Gt||Zt&&8<Zt&&11>=Zt),nr=String.fromCharCode(32),tr=!1;function rr(e,n){switch(e){case"keyup":return-1!==Xt.indexOf(n.keyCode);case"keydown":return 229!==n.keyCode;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function lr(e){e=e.detail;return"object"===typeof e&&"data"in e?e.data:null}var ar=!1;function ur(e,n){switch(e){case"compositionend":return lr(n);case"keypress":if(32!==n.which)return null;tr=!0;return nr;case"textInput":return e=n.data,e===nr&&tr?null:e;default:return null}}function ir(e,n){if(ar)return"compositionend"===e||!Gt&&rr(e,n)?(e=ft(),ct=st=ot=null,ar=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(n.ctrlKey||n.altKey||n.metaKey)||n.ctrlKey&&n.altKey){if(n.char&&1<n.char.length)return n.char;if(n.which)return String.fromCharCode(n.which)}return null;case"compositionend":return er&&"ko"!==n.locale?null:n.data;default:return null}}var or={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function sr(e){var n=e&&e.nodeName&&e.nodeName.toLowerCase();return"input"===n?!!or[e.type]:"textarea"===n?!0:!1}function cr(e,n,t,r){Pe(r);n=ml(n,"onChange");0<n.length&&(t=new vt("onChange","change",null,t,r),e.push({event:t,listeners:n}))}var fr=null,dr=null;function pr(e){ul(e,0)}function mr(e){var n=Hl(e);if(G(n))return e}function hr(e,n){if("change"===e)return n}var gr=!1;if(c){var vr;if(c){var yr="oninput"in document;if(!yr){var br=document.createElement("div");br.setAttribute("oninput","return;");yr="function"===typeof br.oninput}vr=yr}else vr=!1;gr=vr&&(!document.documentMode||9<document.documentMode)}function kr(){fr&&(fr.detachEvent("onpropertychange",wr),dr=fr=null)}function wr(e){if("value"===e.propertyName&&mr(dr)){var n=[];cr(n,dr,e,Ee(e));De(pr,n)}}function Sr(e,n,t){"focusin"===e?(kr(),fr=n,dr=t,fr.attachEvent("onpropertychange",wr)):"focusout"===e&&kr()}function xr(e){if("selectionchange"===e||"keyup"===e||"keydown"===e)return mr(dr)}function Er(e,n){if("click"===e)return mr(n)}function Cr(e,n){if("input"===e||"change"===e)return mr(n)}function _r(e,n){return e===n&&(0!==e||1/e===1/n)||e!==e&&n!==n}var Nr="function"===typeof Object.is?Object.is:_r;function zr(e,n){if(Nr(e,n))return!0;if("object"!==typeof e||null===e||"object"!==typeof n||null===n)return!1;var t=Object.keys(e),r=Object.keys(n);if(t.length!==r.length)return!1;for(r=0;r<t.length;r++){var l=t[r];if(!f.call(n,l)||!Nr(e[l],n[l]))return!1}return!0}function Pr(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Tr(e,n){var t=Pr(e);e=0;for(var r;t;){if(3===t.nodeType){r=e+t.textContent.length;if(e<=n&&r>=n)return{node:t,offset:n-e};e=r}e:{for(;t;){if(t.nextSibling){t=t.nextSibling;break e}t=t.parentNode}t=void 0}t=Pr(t)}}function Lr(e,n){return e&&n?e===n?!0:e&&3===e.nodeType?!1:n&&3===n.nodeType?Lr(e,n.parentNode):"contains"in e?e.contains(n):e.compareDocumentPosition?!!(e.compareDocumentPosition(n)&16):!1:!1}function Mr(){for(var e=window,n=Z();n instanceof e.HTMLIFrameElement;){try{var t="string"===typeof n.contentWindow.location.href}catch(r){t=!1}if(t)e=n.contentWindow;else break;n=Z(e.document)}return n}function Fr(e){var n=e&&e.nodeName&&e.nodeName.toLowerCase();return n&&("input"===n&&("text"===e.type||"search"===e.type||"tel"===e.type||"url"===e.type||"password"===e.type)||"textarea"===n||"true"===e.contentEditable)}function Dr(e){var n=Mr(),t=e.focusedElem,r=e.selectionRange;if(n!==t&&t&&t.ownerDocument&&Lr(t.ownerDocument.documentElement,t)){if(null!==r&&Fr(t))if(n=r.start,e=r.end,void 0===e&&(e=n),"selectionStart"in t)t.selectionStart=n,t.selectionEnd=Math.min(e,t.value.length);else if(e=(n=t.ownerDocument||document)&&n.defaultView||window,e.getSelection){e=e.getSelection();var l=t.textContent.length,a=Math.min(r.start,l);r=void 0===r.end?a:Math.min(r.end,l);!e.extend&&a>r&&(l=r,r=a,a=l);l=Tr(t,a);var u=Tr(t,r);l&&u&&(1!==e.rangeCount||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==u.node||e.focusOffset!==u.offset)&&(n=n.createRange(),n.setStart(l.node,l.offset),e.removeAllRanges(),a>r?(e.addRange(n),e.extend(u.node,u.offset)):(n.setEnd(u.node,u.offset),e.addRange(n)))}n=[];for(e=t;e=e.parentNode;)1===e.nodeType&&n.push({element:e,left:e.scrollLeft,top:e.scrollTop});"function"===typeof t.focus&&t.focus();for(t=0;t<n.length;t++)e=n[t],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Rr=c&&"documentMode"in document&&11>=document.documentMode,Or=null,Ir=null,Ur=null,Vr=!1;function Ar(e,n,t){var r=t.window===t?t.document:9===t.nodeType?t:t.ownerDocument;Vr||null==Or||Or!==Z(r)||(r=Or,"selectionStart"in r&&Fr(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Ur&&zr(Ur,r)||(Ur=r,r=ml(Ir,"onSelect"),0<r.length&&(n=new vt("onSelect","select",null,n,t),e.push({event:n,listeners:r}),n.target=Or)))}function Br(e,n){var t={};t[e.toLowerCase()]=n.toLowerCase();t["Webkit"+e]="webkit"+n;t["Moz"+e]="moz"+n;return t}var Hr={animationend:Br("Animation","AnimationEnd"),animationiteration:Br("Animation","AnimationIteration"),animationstart:Br("Animation","AnimationStart"),transitionend:Br("Transition","TransitionEnd")},Wr={},Qr={};c&&(Qr=document.createElement("div").style,"AnimationEvent"in window||(delete Hr.animationend.animation,delete Hr.animationiteration.animation,delete Hr.animationstart.animation),"TransitionEvent"in window||delete Hr.transitionend.transition);function jr(e){if(Wr[e])return Wr[e];if(!Hr[e])return e;var n=Hr[e],t;for(t in n)if(n.hasOwnProperty(t)&&t in Qr)return Wr[e]=n[t];return e}var $r=jr("animationend"),Kr=jr("animationiteration"),qr=jr("animationstart"),Yr=jr("transitionend"),Xr=new Map,Gr="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Zr(e,n){Xr.set(e,n);o(n,[e])}for(var Jr=0;Jr<Gr.length;Jr++){var el=Gr[Jr],nl=el.toLowerCase(),tl=el[0].toUpperCase()+el.slice(1);Zr(nl,"on"+tl)}Zr($r,"onAnimationEnd");Zr(Kr,"onAnimationIteration");Zr(qr,"onAnimationStart");Zr("dblclick","onDoubleClick");Zr("focusin","onFocus");Zr("focusout","onBlur");Zr(Yr,"onTransitionEnd");s("onMouseEnter",["mouseout","mouseover"]);s("onMouseLeave",["mouseout","mouseover"]);s("onPointerEnter",["pointerout","pointerover"]);s("onPointerLeave",["pointerout","pointerover"]);o("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));o("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));o("onBeforeInput",["compositionend","keypress","textInput","paste"]);o("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));o("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));o("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var rl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),ll=new Set("cancel close invalid load scroll toggle".split(" ").concat(rl));function al(e,n,t){var r=e.type||"unknown-event";e.currentTarget=t;je(r,n,void 0,e);e.currentTarget=null}function ul(e,n){n=0!==(n&4);for(var t=0;t<e.length;t++){var r=e[t],l=r.event;r=r.listeners;e:{var a=void 0;if(n)for(var u=r.length-1;0<=u;u--){var i=r[u],o=i.instance,s=i.currentTarget;i=i.listener;if(o!==a&&l.isPropagationStopped())break e;al(l,i,s);a=o}else for(u=0;u<r.length;u++){i=r[u];o=i.instance;s=i.currentTarget;i=i.listener;if(o!==a&&l.isPropagationStopped())break e;al(l,i,s);a=o}}}if(Be)throw e=He,Be=!1,He=null,e}function il(e,n){var t=n[Il];void 0===t&&(t=n[Il]=new Set);var r=e+"__bubble";t.has(r)||(fl(n,e,2,!1),t.add(r))}function ol(e,n,t){var r=0;n&&(r|=4);fl(t,e,r,n)}var sl="_reactListening"+Math.random().toString(36).slice(2);function cl(e){if(!e[sl]){e[sl]=!0;u.forEach((function(n){"selectionchange"!==n&&(ll.has(n)||ol(n,!1,e),ol(n,!0,e))}));var n=9===e.nodeType?e:e.ownerDocument;null===n||n[sl]||(n[sl]=!0,ol("selectionchange",!1,n))}}function fl(e,n,t,r){switch(it(n)){case 1:var l=tt;break;case 4:l=rt;break;default:l=lt}t=l.bind(null,n,t,e);l=void 0;!Oe||"touchstart"!==n&&"touchmove"!==n&&"wheel"!==n||(l=!0);r?void 0!==l?e.addEventListener(n,t,{capture:!0,passive:l}):e.addEventListener(n,t,!0):void 0!==l?e.addEventListener(n,t,{passive:l}):e.addEventListener(n,t,!1)}function dl(e,n,t,r,l){var a=r;if(0===(n&1)&&0===(n&2)&&null!==r)e:for(;;){if(null===r)return;var u=r.tag;if(3===u||4===u){var i=r.stateNode.containerInfo;if(i===l||8===i.nodeType&&i.parentNode===l)break;if(4===u)for(u=r.return;null!==u;){var o=u.tag;if(3===o||4===o)if(o=u.stateNode.containerInfo,o===l||8===o.nodeType&&o.parentNode===l)return;u=u.return}for(;null!==i;){u=Al(i);if(null===u)return;o=u.tag;if(5===o||6===o){r=a=u;continue e}i=i.parentNode}}r=r.return}De((function(){var r=a,l=Ee(t),u=[];e:{var i=Xr.get(e);if(void 0!==i){var o=vt,s=e;switch(e){case"keypress":if(0===dt(t))break e;case"keydown":case"keyup":o=Bt;break;case"focusin":s="focus";o=zt;break;case"focusout":s="blur";o=zt;break;case"beforeblur":case"afterblur":o=zt;break;case"click":if(2===t.button)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":o=Et;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":o=_t;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":o=jt;break;case $r:case Kr:case qr:o=Tt;break;case Yr:o=Kt;break;case"scroll":o=bt;break;case"wheel":o=Yt;break;case"copy":case"cut":case"paste":o=Mt;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":o=Wt}var c=0!==(n&4),f=!c&&"scroll"===e,d=c?null!==i?i+"Capture":null:i;c=[];for(var p=r,m;null!==p;){m=p;var h=m.stateNode;5===m.tag&&null!==h&&(m=h,null!==d&&(h=Re(p,d),null!=h&&c.push(pl(p,h,m))));if(f)break;p=p.return}0<c.length&&(i=new o(i,s,null,t,l),u.push({event:i,listeners:c}))}}if(0===(n&7)){e:{i="mouseover"===e||"pointerover"===e;o="mouseout"===e||"pointerout"===e;if(i&&t!==xe&&(s=t.relatedTarget||t.fromElement)&&(Al(s)||s[Ol]))break e;if(o||i){i=l.window===l?l:(i=l.ownerDocument)?i.defaultView||i.parentWindow:window;if(o){if(s=t.relatedTarget||t.toElement,o=r,s=s?Al(s):null,null!==s&&(f=$e(s),s!==f||5!==s.tag&&6!==s.tag))s=null}else o=null,s=r;if(o!==s){c=Et;h="onMouseLeave";d="onMouseEnter";p="mouse";if("pointerout"===e||"pointerover"===e)c=Wt,h="onPointerLeave",d="onPointerEnter",p="pointer";f=null==o?i:Hl(o);m=null==s?i:Hl(s);i=new c(h,p+"leave",o,t,l);i.target=f;i.relatedTarget=m;h=null;Al(l)===r&&(c=new c(d,p+"enter",s,t,l),c.target=m,c.relatedTarget=f,h=c);f=h;if(o&&s)n:{c=o;d=s;p=0;for(m=c;m;m=hl(m))p++;m=0;for(h=d;h;h=hl(h))m++;for(;0<p-m;)c=hl(c),p--;for(;0<m-p;)d=hl(d),m--;for(;p--;){if(c===d||null!==d&&c===d.alternate)break n;c=hl(c);d=hl(d)}c=null}else c=null;null!==o&&gl(u,i,o,c,!1);null!==s&&null!==f&&gl(u,f,s,c,!0)}}}e:{i=r?Hl(r):window;o=i.nodeName&&i.nodeName.toLowerCase();if("select"===o||"input"===o&&"file"===i.type)var g=hr;else if(sr(i))if(gr)g=Cr;else{g=xr;var v=Sr}else(o=i.nodeName)&&"input"===o.toLowerCase()&&("checkbox"===i.type||"radio"===i.type)&&(g=Er);if(g&&(g=g(e,r))){cr(u,g,t,l);break e}v&&v(e,i,r);"focusout"===e&&(v=i._wrapperState)&&v.controlled&&"number"===i.type&&le(i,"number",i.value)}v=r?Hl(r):window;switch(e){case"focusin":if(sr(v)||"true"===v.contentEditable)Or=v,Ir=r,Ur=null;break;case"focusout":Ur=Ir=Or=null;break;case"mousedown":Vr=!0;break;case"contextmenu":case"mouseup":case"dragend":Vr=!1;Ar(u,t,l);break;case"selectionchange":if(Rr)break;case"keydown":case"keyup":Ar(u,t,l)}var y;if(Gt)e:{switch(e){case"compositionstart":var b="onCompositionStart";break e;case"compositionend":b="onCompositionEnd";break e;case"compositionupdate":b="onCompositionUpdate";break e}b=void 0}else ar?rr(e,t)&&(b="onCompositionEnd"):"keydown"===e&&229===t.keyCode&&(b="onCompositionStart");b&&(er&&"ko"!==t.locale&&(ar||"onCompositionStart"!==b?"onCompositionEnd"===b&&ar&&(y=ft()):(ot=l,st="value"in ot?ot.value:ot.textContent,ar=!0)),v=ml(r,b),0<v.length&&(b=new Dt(b,e,null,t,l),u.push({event:b,listeners:v}),y?b.data=y:(y=lr(t),null!==y&&(b.data=y))));if(y=Jt?ur(e,t):ir(e,t))r=ml(r,"onBeforeInput"),0<r.length&&(l=new Dt("onBeforeInput","beforeinput",null,t,l),u.push({event:l,listeners:r}),l.data=y)}ul(u,n)}))}function pl(e,n,t){return{instance:e,listener:n,currentTarget:t}}function ml(e,n){for(var t=n+"Capture",r=[];null!==e;){var l=e,a=l.stateNode;5===l.tag&&null!==a&&(l=a,a=Re(e,t),null!=a&&r.unshift(pl(e,a,l)),a=Re(e,n),null!=a&&r.push(pl(e,a,l)));e=e.return}return r}function hl(e){if(null===e)return null;do{e=e.return}while(e&&5!==e.tag);return e?e:null}function gl(e,n,t,r,l){for(var a=n._reactName,u=[];null!==t&&t!==r;){var i=t,o=i.alternate,s=i.stateNode;if(null!==o&&o===r)break;5===i.tag&&null!==s&&(i=s,l?(o=Re(t,a),null!=o&&u.unshift(pl(t,o,i))):l||(o=Re(t,a),null!=o&&u.push(pl(t,o,i))));t=t.return}0!==u.length&&e.push({event:n,listeners:u})}var vl=/\r\n?/g,yl=/\u0000|\uFFFD/g;function bl(e){return("string"===typeof e?e:""+e).replace(vl,"\n").replace(yl,"")}function kl(e,n,t){n=bl(n);if(bl(e)!==n&&t)throw Error(a(425))}function wl(){}var Sl=null,xl=null;function El(e,n){return"textarea"===e||"noscript"===e||"string"===typeof n.children||"number"===typeof n.children||"object"===typeof n.dangerouslySetInnerHTML&&null!==n.dangerouslySetInnerHTML&&null!=n.dangerouslySetInnerHTML.__html}var Cl="function"===typeof setTimeout?setTimeout:void 0,_l="function"===typeof clearTimeout?clearTimeout:void 0,Nl="function"===typeof Promise?Promise:void 0,zl="function"===typeof queueMicrotask?queueMicrotask:"undefined"!==typeof Nl?function(e){return Nl.resolve(null).then(e).catch(Pl)}:Cl;function Pl(e){setTimeout((function(){throw e}))}function Tl(e,n){var t=n,r=0;do{var l=t.nextSibling;e.removeChild(t);if(l&&8===l.nodeType)if(t=l.data,"/$"===t){if(0===r){e.removeChild(l);Jn(n);return}r--}else"$"!==t&&"$?"!==t&&"$!"!==t||r++;t=l}while(t);Jn(n)}function Ll(e){for(;null!=e;e=e.nextSibling){var n=e.nodeType;if(1===n||3===n)break;if(8===n){n=e.data;if("$"===n||"$!"===n||"$?"===n)break;if("/$"===n)return null}}return e}function Ml(e){e=e.previousSibling;for(var n=0;e;){if(8===e.nodeType){var t=e.data;if("$"===t||"$!"===t||"$?"===t){if(0===n)return e;n--}else"/$"===t&&n++}e=e.previousSibling}return null}var Fl=Math.random().toString(36).slice(2),Dl="__reactFiber$"+Fl,Rl="__reactProps$"+Fl,Ol="__reactContainer$"+Fl,Il="__reactEvents$"+Fl,Ul="__reactListeners$"+Fl,Vl="__reactHandles$"+Fl;function Al(e){var n=e[Dl];if(n)return n;for(var t=e.parentNode;t;){if(n=t[Ol]||t[Dl]){t=n.alternate;if(null!==n.child||null!==t&&null!==t.child)for(e=Ml(e);null!==e;){if(t=e[Dl])return t;e=Ml(e)}return n}e=t;t=e.parentNode}return null}function Bl(e){e=e[Dl]||e[Ol];return!e||5!==e.tag&&6!==e.tag&&13!==e.tag&&3!==e.tag?null:e}function Hl(e){if(5===e.tag||6===e.tag)return e.stateNode;throw Error(a(33))}function Wl(e){return e[Rl]||null}var Ql=[],jl=-1;function $l(e){return{current:e}}function Kl(e){0>jl||(e.current=Ql[jl],Ql[jl]=null,jl--)}function ql(e,n){jl++;Ql[jl]=e.current;e.current=n}var Yl={},Xl=$l(Yl),Gl=$l(!1),Zl=Yl;function Jl(e,n){var t=e.type.contextTypes;if(!t)return Yl;var r=e.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===n)return r.__reactInternalMemoizedMaskedChildContext;var l={},a;for(a in t)l[a]=n[a];r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=n,e.__reactInternalMemoizedMaskedChildContext=l);return l}function ea(e){e=e.childContextTypes;return null!==e&&void 0!==e}function na(){Kl(Gl);Kl(Xl)}function ta(e,n,t){if(Xl.current!==Yl)throw Error(a(168));ql(Xl,n);ql(Gl,t)}function ra(e,n,t){var r=e.stateNode;n=n.childContextTypes;if("function"!==typeof r.getChildContext)return t;r=r.getChildContext();for(var l in r)if(!(l in n))throw Error(a(108,$(e)||"Unknown",l));return V({},t,r)}function la(e){e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Yl;Zl=Xl.current;ql(Xl,e);ql(Gl,Gl.current);return!0}function aa(e,n,t){var r=e.stateNode;if(!r)throw Error(a(169));t?(e=ra(e,n,Zl),r.__reactInternalMemoizedMergedChildContext=e,Kl(Gl),Kl(Xl),ql(Xl,e)):Kl(Gl);ql(Gl,t)}var ua=null,ia=!1,oa=!1;function sa(e){null===ua?ua=[e]:ua.push(e)}function ca(e){ia=!0;sa(e)}function fa(){if(!oa&&null!==ua){oa=!0;var e=0,n=Pn;try{var t=ua;for(Pn=1;e<t.length;e++){var r=t[e];do{r=r(!0)}while(null!==r)}ua=null;ia=!1}catch(l){throw null!==ua&&(ua=ua.slice(e+1)),Ze(ln,fa),l}finally{Pn=n,oa=!1}}return null}var da=[],pa=0,ma=null,ha=0,ga=[],va=0,ya=null,ba=1,ka="";function wa(e,n){da[pa++]=ha;da[pa++]=ma;ma=e;ha=n}function Sa(e,n,t){ga[va++]=ba;ga[va++]=ka;ga[va++]=ya;ya=e;var r=ba;e=ka;var l=32-pn(r)-1;r&=~(1<<l);t+=1;var a=32-pn(n)+l;if(30<a){var u=l-l%5;a=(r&(1<<u)-1).toString(32);r>>=u;l-=u;ba=1<<32-pn(n)+l|t<<l|r;ka=a+e}else ba=1<<a|t<<l|r,ka=e}function xa(e){null!==e.return&&(wa(e,1),Sa(e,1,0))}function Ea(e){for(;e===ma;)ma=da[--pa],da[pa]=null,ha=da[--pa],da[pa]=null;for(;e===ya;)ya=ga[--va],ga[va]=null,ka=ga[--va],ga[va]=null,ba=ga[--va],ga[va]=null}var Ca=null,_a=null,Na=!1,za=null;function Pa(e,n){var t=uc(5,null,null,0);t.elementType="DELETED";t.stateNode=n;t.return=e;n=e.deletions;null===n?(e.deletions=[t],e.flags|=16):n.push(t)}function Ta(e,n){switch(e.tag){case 5:var t=e.type;n=1!==n.nodeType||t.toLowerCase()!==n.nodeName.toLowerCase()?null:n;return null!==n?(e.stateNode=n,Ca=e,_a=Ll(n.firstChild),!0):!1;case 6:return n=""===e.pendingProps||3!==n.nodeType?null:n,null!==n?(e.stateNode=n,Ca=e,_a=null,!0):!1;case 13:return n=8!==n.nodeType?null:n,null!==n?(t=null!==ya?{id:ba,overflow:ka}:null,e.memoizedState={dehydrated:n,treeContext:t,retryLane:1073741824},t=uc(18,null,null,0),t.stateNode=n,t.return=e,e.child=t,Ca=e,_a=null,!0):!1;default:return!1}}function La(e){return 0!==(e.mode&1)&&0===(e.flags&128)}function Ma(e){if(Na){var n=_a;if(n){var t=n;if(!Ta(e,n)){if(La(e))throw Error(a(418));n=Ll(t.nextSibling);var r=Ca;n&&Ta(e,n)?Pa(r,t):(e.flags=e.flags&-4097|2,Na=!1,Ca=e)}}else{if(La(e))throw Error(a(418));e.flags=e.flags&-4097|2;Na=!1;Ca=e}}}function Fa(e){for(e=e.return;null!==e&&5!==e.tag&&3!==e.tag&&13!==e.tag;)e=e.return;Ca=e}function Da(e){if(e!==Ca)return!1;if(!Na)return Fa(e),Na=!0,!1;var n;(n=3!==e.tag)&&!(n=5!==e.tag)&&(n=e.type,n="head"!==n&&"body"!==n&&!El(e.type,e.memoizedProps));if(n&&(n=_a)){if(La(e))throw Ra(),Error(a(418));for(;n;)Pa(e,n),n=Ll(n.nextSibling)}Fa(e);if(13===e.tag){e=e.memoizedState;e=null!==e?e.dehydrated:null;if(!e)throw Error(a(317));e:{e=e.nextSibling;for(n=0;e;){if(8===e.nodeType){var t=e.data;if("/$"===t){if(0===n){_a=Ll(e.nextSibling);break e}n--}else"$"!==t&&"$!"!==t&&"$?"!==t||n++}e=e.nextSibling}_a=null}}else _a=Ca?Ll(e.stateNode.nextSibling):null;return!0}function Ra(){for(var e=_a;e;)e=Ll(e.nextSibling)}function Oa(){_a=Ca=null;Na=!1}function Ia(e){null===za?za=[e]:za.push(e)}var Ua=x.ReactCurrentBatchConfig;function Va(e,n){if(e&&e.defaultProps){n=V({},n);e=e.defaultProps;for(var t in e)void 0===n[t]&&(n[t]=e[t]);return n}return n}var Aa=$l(null),Ba=null,Ha=null,Wa=null;function Qa(){Wa=Ha=Ba=null}function ja(e){var n=Aa.current;Kl(Aa);e._currentValue=n}function $a(e,n,t){for(;null!==e;){var r=e.alternate;(e.childLanes&n)!==n?(e.childLanes|=n,null!==r&&(r.childLanes|=n)):null!==r&&(r.childLanes&n)!==n&&(r.childLanes|=n);if(e===t)break;e=e.return}}function Ka(e,n){Ba=e;Wa=Ha=null;e=e.dependencies;null!==e&&null!==e.firstContext&&(0!==(e.lanes&n)&&(Hi=!0),e.firstContext=null)}function qa(e){var n=e._currentValue;if(Wa!==e)if(e={context:e,memoizedValue:n,next:null},null===Ha){if(null===Ba)throw Error(a(308));Ha=e;Ba.dependencies={lanes:0,firstContext:e}}else Ha=Ha.next=e;return n}var Ya=null;function Xa(e){null===Ya?Ya=[e]:Ya.push(e)}function Ga(e,n,t,r){var l=n.interleaved;null===l?(t.next=t,Xa(n)):(t.next=l.next,l.next=t);n.interleaved=t;return Za(e,r)}function Za(e,n){e.lanes|=n;var t=e.alternate;null!==t&&(t.lanes|=n);t=e;for(e=e.return;null!==e;)e.childLanes|=n,t=e.alternate,null!==t&&(t.childLanes|=n),t=e,e=e.return;return 3===t.tag?t.stateNode:null}var Ja=!1;function eu(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function nu(e,n){e=e.updateQueue;n.updateQueue===e&&(n.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function tu(e,n){return{eventTime:e,lane:n,tag:0,payload:null,callback:null,next:null}}function ru(e,n,t){var r=e.updateQueue;if(null===r)return null;r=r.shared;if(0!==(es&2)){var l=r.pending;null===l?n.next=n:(n.next=l.next,l.next=n);r.pending=n;return Za(e,t)}l=r.interleaved;null===l?(n.next=n,Xa(r)):(n.next=l.next,l.next=n);r.interleaved=n;return Za(e,t)}function lu(e,n,t){n=n.updateQueue;if(null!==n&&(n=n.shared,0!==(t&4194240))){var r=n.lanes;r&=e.pendingLanes;t|=r;n.lanes=t;zn(e,t)}}function au(e,n){var t=e.updateQueue,r=e.alternate;if(null!==r&&(r=r.updateQueue,t===r)){var l=null,a=null;t=t.firstBaseUpdate;if(null!==t){do{var u={eventTime:t.eventTime,lane:t.lane,tag:t.tag,payload:t.payload,callback:t.callback,next:null};null===a?l=a=u:a=a.next=u;t=t.next}while(null!==t);null===a?l=a=n:a=a.next=n}else l=a=n;t={baseState:r.baseState,firstBaseUpdate:l,lastBaseUpdate:a,shared:r.shared,effects:r.effects};e.updateQueue=t;return}e=t.lastBaseUpdate;null===e?t.firstBaseUpdate=n:e.next=n;t.lastBaseUpdate=n}function uu(e,n,t,r){var l=e.updateQueue;Ja=!1;var a=l.firstBaseUpdate,u=l.lastBaseUpdate,i=l.shared.pending;if(null!==i){l.shared.pending=null;var o=i,s=o.next;o.next=null;null===u?a=s:u.next=s;u=o;var c=e.alternate;null!==c&&(c=c.updateQueue,i=c.lastBaseUpdate,i!==u&&(null===i?c.firstBaseUpdate=s:i.next=s,c.lastBaseUpdate=o))}if(null!==a){var f=l.baseState;u=0;c=s=o=null;i=a;do{var d=i.lane,p=i.eventTime;if((r&d)===d){null!==c&&(c=c.next={eventTime:p,lane:0,tag:i.tag,payload:i.payload,callback:i.callback,next:null});e:{var m=e,h=i;d=n;p=t;switch(h.tag){case 1:m=h.payload;if("function"===typeof m){f=m.call(p,f,d);break e}f=m;break e;case 3:m.flags=m.flags&-65537|128;case 0:m=h.payload;d="function"===typeof m?m.call(p,f,d):m;if(null===d||void 0===d)break e;f=V({},f,d);break e;case 2:Ja=!0}}null!==i.callback&&0!==i.lane&&(e.flags|=64,d=l.effects,null===d?l.effects=[i]:d.push(i))}else p={eventTime:p,lane:d,tag:i.tag,payload:i.payload,callback:i.callback,next:null},null===c?(s=c=p,o=f):c=c.next=p,u|=d;i=i.next;if(null===i)if(i=l.shared.pending,null===i)break;else d=i,i=d.next,d.next=null,l.lastBaseUpdate=d,l.shared.pending=null}while(1);null===c&&(o=f);l.baseState=o;l.firstBaseUpdate=s;l.lastBaseUpdate=c;n=l.shared.interleaved;if(null!==n){l=n;do{u|=l.lane,l=l.next}while(l!==n)}else null===a&&(l.shared.lanes=0);os|=u;e.lanes=u;e.memoizedState=f}}function iu(e,n,t){e=n.effects;n.effects=null;if(null!==e)for(n=0;n<e.length;n++){var r=e[n],l=r.callback;if(null!==l){r.callback=null;r=t;if("function"!==typeof l)throw Error(a(191,l));l.call(r)}}}var ou=(new r.Component).refs;function su(e,n,t,r){n=e.memoizedState;t=t(r,n);t=null===t||void 0===t?n:V({},n,t);e.memoizedState=t;0===e.lanes&&(e.updateQueue.baseState=t)}var cu={isMounted:function(e){return(e=e._reactInternals)?$e(e)===e:!1},enqueueSetState:function(e,n,t){e=e._reactInternals;var r=_s(),l=Ns(e),a=tu(r,l);a.payload=n;void 0!==t&&null!==t&&(a.callback=t);n=ru(e,a,l);null!==n&&(zs(n,e,l,r),lu(n,e,l))},enqueueReplaceState:function(e,n,t){e=e._reactInternals;var r=_s(),l=Ns(e),a=tu(r,l);a.tag=1;a.payload=n;void 0!==t&&null!==t&&(a.callback=t);n=ru(e,a,l);null!==n&&(zs(n,e,l,r),lu(n,e,l))},enqueueForceUpdate:function(e,n){e=e._reactInternals;var t=_s(),r=Ns(e),l=tu(t,r);l.tag=2;void 0!==n&&null!==n&&(l.callback=n);n=ru(e,l,r);null!==n&&(zs(n,e,r,t),lu(n,e,r))}};function fu(e,n,t,r,l,a,u){e=e.stateNode;return"function"===typeof e.shouldComponentUpdate?e.shouldComponentUpdate(r,a,u):n.prototype&&n.prototype.isPureReactComponent?!zr(t,r)||!zr(l,a):!0}function du(e,n,t){var r=!1,l=Yl;var a=n.contextType;"object"===typeof a&&null!==a?a=qa(a):(l=ea(n)?Zl:Xl.current,r=n.contextTypes,a=(r=null!==r&&void 0!==r)?Jl(e,l):Yl);n=new n(t,a);e.memoizedState=null!==n.state&&void 0!==n.state?n.state:null;n.updater=cu;e.stateNode=n;n._reactInternals=e;r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=a);return n}function pu(e,n,t,r){e=n.state;"function"===typeof n.componentWillReceiveProps&&n.componentWillReceiveProps(t,r);"function"===typeof n.UNSAFE_componentWillReceiveProps&&n.UNSAFE_componentWillReceiveProps(t,r);n.state!==e&&cu.enqueueReplaceState(n,n.state,null)}function mu(e,n,t,r){var l=e.stateNode;l.props=t;l.state=e.memoizedState;l.refs=ou;eu(e);var a=n.contextType;"object"===typeof a&&null!==a?l.context=qa(a):(a=ea(n)?Zl:Xl.current,l.context=Jl(e,a));l.state=e.memoizedState;a=n.getDerivedStateFromProps;"function"===typeof a&&(su(e,n,a,t),l.state=e.memoizedState);"function"===typeof n.getDerivedStateFromProps||"function"===typeof l.getSnapshotBeforeUpdate||"function"!==typeof l.UNSAFE_componentWillMount&&"function"!==typeof l.componentWillMount||(n=l.state,"function"===typeof l.componentWillMount&&l.componentWillMount(),"function"===typeof l.UNSAFE_componentWillMount&&l.UNSAFE_componentWillMount(),n!==l.state&&cu.enqueueReplaceState(l,l.state,null),uu(e,t,l,r),l.state=e.memoizedState);"function"===typeof l.componentDidMount&&(e.flags|=4194308)}function hu(e,n,t){e=t.ref;if(null!==e&&"function"!==typeof e&&"object"!==typeof e){if(t._owner){t=t._owner;if(t){if(1!==t.tag)throw Error(a(309));var r=t.stateNode}if(!r)throw Error(a(147,e));var l=r,u=""+e;if(null!==n&&null!==n.ref&&"function"===typeof n.ref&&n.ref._stringRef===u)return n.ref;n=function(e){var n=l.refs;n===ou&&(n=l.refs={});null===e?delete n[u]:n[u]=e};n._stringRef=u;return n}if("string"!==typeof e)throw Error(a(284));if(!t._owner)throw Error(a(290,e))}return e}function gu(e,n){e=Object.prototype.toString.call(n);throw Error(a(31,"[object Object]"===e?"object with keys {"+Object.keys(n).join(", ")+"}":e))}function vu(e){var n=e._init;return n(e._payload)}function yu(e){function n(n,t){if(e){var r=n.deletions;null===r?(n.deletions=[t],n.flags|=16):r.push(t)}}function t(t,r){if(!e)return null;for(;null!==r;)n(t,r),r=r.sibling;return null}function r(e,n){for(e=new Map;null!==n;)null!==n.key?e.set(n.key,n):e.set(n.index,n),n=n.sibling;return e}function l(e,n){e=sc(e,n);e.index=0;e.sibling=null;return e}function u(n,t,r){n.index=r;if(!e)return n.flags|=1048576,t;r=n.alternate;if(null!==r)return r=r.index,r<t?(n.flags|=2,t):r;n.flags|=2;return t}function i(n){e&&null===n.alternate&&(n.flags|=2);return n}function o(e,n,t,r){if(null===n||6!==n.tag)return n=pc(t,e.mode,r),n.return=e,n;n=l(n,t);n.return=e;return n}function s(e,n,t,r){var a=t.type;if(a===_)return f(e,n,t.props.children,r,t.key);if(null!==n&&(n.elementType===a||"object"===typeof a&&null!==a&&a.$$typeof===R&&vu(a)===n.type))return r=l(n,t.props),r.ref=hu(e,n,t),r.return=e,r;r=cc(t.type,t.key,t.props,null,e.mode,r);r.ref=hu(e,n,t);r.return=e;return r}function c(e,n,t,r){if(null===n||4!==n.tag||n.stateNode.containerInfo!==t.containerInfo||n.stateNode.implementation!==t.implementation)return n=mc(t,e.mode,r),n.return=e,n;n=l(n,t.children||[]);n.return=e;return n}function f(e,n,t,r,a){if(null===n||7!==n.tag)return n=fc(t,e.mode,r,a),n.return=e,n;n=l(n,t);n.return=e;return n}function d(e,n,t){if("string"===typeof n&&""!==n||"number"===typeof n)return n=pc(""+n,e.mode,t),n.return=e,n;if("object"===typeof n&&null!==n){switch(n.$$typeof){case E:return t=cc(n.type,n.key,n.props,null,e.mode,t),t.ref=hu(e,null,n),t.return=e,t;case C:return n=mc(n,e.mode,t),n.return=e,n;case R:var r=n._init;return d(e,r(n._payload),t)}if(ae(n)||U(n))return n=fc(n,e.mode,t,null),n.return=e,n;gu(e,n)}return null}function p(e,n,t,r){var l=null!==n?n.key:null;if("string"===typeof t&&""!==t||"number"===typeof t)return null!==l?null:o(e,n,""+t,r);if("object"===typeof t&&null!==t){switch(t.$$typeof){case E:return t.key===l?s(e,n,t,r):null;case C:return t.key===l?c(e,n,t,r):null;case R:return l=t._init,p(e,n,l(t._payload),r)}if(ae(t)||U(t))return null!==l?null:f(e,n,t,r,null);gu(e,t)}return null}function m(e,n,t,r,l){if("string"===typeof r&&""!==r||"number"===typeof r)return e=e.get(t)||null,o(n,e,""+r,l);if("object"===typeof r&&null!==r){switch(r.$$typeof){case E:return e=e.get(null===r.key?t:r.key)||null,s(n,e,r,l);case C:return e=e.get(null===r.key?t:r.key)||null,c(n,e,r,l);case R:var a=r._init;return m(e,n,t,a(r._payload),l)}if(ae(r)||U(r))return e=e.get(t)||null,f(n,e,r,l,null);gu(n,r)}return null}function h(l,a,i,o){for(var s=null,c=null,f=a,h=a=0,g=null;null!==f&&h<i.length;h++){f.index>h?(g=f,f=null):g=f.sibling;var v=p(l,f,i[h],o);if(null===v){null===f&&(f=g);break}e&&f&&null===v.alternate&&n(l,f);a=u(v,a,h);null===c?s=v:c.sibling=v;c=v;f=g}if(h===i.length)return t(l,f),Na&&wa(l,h),s;if(null===f){for(;h<i.length;h++)f=d(l,i[h],o),null!==f&&(a=u(f,a,h),null===c?s=f:c.sibling=f,c=f);Na&&wa(l,h);return s}for(f=r(l,f);h<i.length;h++)g=m(f,l,h,i[h],o),null!==g&&(e&&null!==g.alternate&&f.delete(null===g.key?h:g.key),a=u(g,a,h),null===c?s=g:c.sibling=g,c=g);e&&f.forEach((function(e){return n(l,e)}));Na&&wa(l,h);return s}function g(l,i,o,s){var c=U(o);if("function"!==typeof c)throw Error(a(150));o=c.call(o);if(null==o)throw Error(a(151));for(var f=c=null,h=i,g=i=0,v=null,y=o.next();null!==h&&!y.done;g++,y=o.next()){h.index>g?(v=h,h=null):v=h.sibling;var b=p(l,h,y.value,s);if(null===b){null===h&&(h=v);break}e&&h&&null===b.alternate&&n(l,h);i=u(b,i,g);null===f?c=b:f.sibling=b;f=b;h=v}if(y.done)return t(l,h),Na&&wa(l,g),c;if(null===h){for(;!y.done;g++,y=o.next())y=d(l,y.value,s),null!==y&&(i=u(y,i,g),null===f?c=y:f.sibling=y,f=y);Na&&wa(l,g);return c}for(h=r(l,h);!y.done;g++,y=o.next())y=m(h,l,g,y.value,s),null!==y&&(e&&null!==y.alternate&&h.delete(null===y.key?g:y.key),i=u(y,i,g),null===f?c=y:f.sibling=y,f=y);e&&h.forEach((function(e){return n(l,e)}));Na&&wa(l,g);return c}function v(e,r,a,u){"object"===typeof a&&null!==a&&a.type===_&&null===a.key&&(a=a.props.children);if("object"===typeof a&&null!==a){switch(a.$$typeof){case E:e:{for(var o=a.key,s=r;null!==s;){if(s.key===o){o=a.type;if(o===_){if(7===s.tag){t(e,s.sibling);r=l(s,a.props.children);r.return=e;e=r;break e}}else if(s.elementType===o||"object"===typeof o&&null!==o&&o.$$typeof===R&&vu(o)===s.type){t(e,s.sibling);r=l(s,a.props);r.ref=hu(e,s,a);r.return=e;e=r;break e}t(e,s);break}else n(e,s);s=s.sibling}a.type===_?(r=fc(a.props.children,e.mode,u,a.key),r.return=e,e=r):(u=cc(a.type,a.key,a.props,null,e.mode,u),u.ref=hu(e,r,a),u.return=e,e=u)}return i(e);case C:e:{for(s=a.key;null!==r;){if(r.key===s)if(4===r.tag&&r.stateNode.containerInfo===a.containerInfo&&r.stateNode.implementation===a.implementation){t(e,r.sibling);r=l(r,a.children||[]);r.return=e;e=r;break e}else{t(e,r);break}else n(e,r);r=r.sibling}r=mc(a,e.mode,u);r.return=e;e=r}return i(e);case R:return s=a._init,v(e,r,s(a._payload),u)}if(ae(a))return h(e,r,a,u);if(U(a))return g(e,r,a,u);gu(e,a)}return"string"===typeof a&&""!==a||"number"===typeof a?(a=""+a,null!==r&&6===r.tag?(t(e,r.sibling),r=l(r,a),r.return=e,e=r):(t(e,r),r=pc(a,e.mode,u),r.return=e,e=r),i(e)):t(e,r)}return v}var bu=yu(!0),ku=yu(!1),wu={},Su=$l(wu),xu=$l(wu),Eu=$l(wu);function Cu(e){if(e===wu)throw Error(a(174));return e}function _u(e,n){ql(Eu,n);ql(xu,e);ql(Su,wu);e=n.nodeType;switch(e){case 9:case 11:n=(n=n.documentElement)?n.namespaceURI:de(null,"");break;default:e=8===e?n.parentNode:n,n=e.namespaceURI||null,e=e.tagName,n=de(n,e)}Kl(Su);ql(Su,n)}function Nu(){Kl(Su);Kl(xu);Kl(Eu)}function zu(e){Cu(Eu.current);var n=Cu(Su.current);var t=de(n,e.type);n!==t&&(ql(xu,e),ql(Su,t))}function Pu(e){xu.current===e&&(Kl(Su),Kl(xu))}var Tu=$l(0);function Lu(e){for(var n=e;null!==n;){if(13===n.tag){var t=n.memoizedState;if(null!==t&&(t=t.dehydrated,null===t||"$?"===t.data||"$!"===t.data))return n}else if(19===n.tag&&void 0!==n.memoizedProps.revealOrder){if(0!==(n.flags&128))return n}else if(null!==n.child){n.child.return=n;n=n.child;continue}if(n===e)break;for(;null===n.sibling;){if(null===n.return||n.return===e)return null;n=n.return}n.sibling.return=n.return;n=n.sibling}return null}var Mu=[];function Fu(){for(var e=0;e<Mu.length;e++)Mu[e]._workInProgressVersionPrimary=null;Mu.length=0}var Du=x.ReactCurrentDispatcher,Ru=x.ReactCurrentBatchConfig,Ou=0,Iu=null,Uu=null,Vu=null,Au=!1,Bu=!1,Hu=0,Wu=0;function Qu(){throw Error(a(321))}function ju(e,n){if(null===n)return!1;for(var t=0;t<n.length&&t<e.length;t++)if(!Nr(e[t],n[t]))return!1;return!0}function $u(e,n,t,r,l,u){Ou=u;Iu=n;n.memoizedState=null;n.updateQueue=null;n.lanes=0;Du.current=null===e||null===e.memoizedState?Pi:Ti;e=t(r,l);if(Bu){u=0;do{Bu=!1;Hu=0;if(25<=u)throw Error(a(301));u+=1;Vu=Uu=null;n.updateQueue=null;Du.current=Li;e=t(r,l)}while(Bu)}Du.current=zi;n=null!==Uu&&null!==Uu.next;Ou=0;Vu=Uu=Iu=null;Au=!1;if(n)throw Error(a(300));return e}function Ku(){var e=0!==Hu;Hu=0;return e}function qu(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};null===Vu?Iu.memoizedState=Vu=e:Vu=Vu.next=e;return Vu}function Yu(){if(null===Uu){var e=Iu.alternate;e=null!==e?e.memoizedState:null}else e=Uu.next;var n=null===Vu?Iu.memoizedState:Vu.next;if(null!==n)Vu=n,Uu=e;else{if(null===e)throw Error(a(310));Uu=e;e={memoizedState:Uu.memoizedState,baseState:Uu.baseState,baseQueue:Uu.baseQueue,queue:Uu.queue,next:null};null===Vu?Iu.memoizedState=Vu=e:Vu=Vu.next=e}return Vu}function Xu(e,n){return"function"===typeof n?n(e):n}function Gu(e){var n=Yu(),t=n.queue;if(null===t)throw Error(a(311));t.lastRenderedReducer=e;var r=Uu,l=r.baseQueue,u=t.pending;if(null!==u){if(null!==l){var i=l.next;l.next=u.next;u.next=i}r.baseQueue=l=u;t.pending=null}if(null!==l){u=l.next;r=r.baseState;var o=i=null,s=null,c=u;do{var f=c.lane;if((Ou&f)===f)null!==s&&(s=s.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:e(r,c.action);else{var d={lane:f,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};null===s?(o=s=d,i=r):s=s.next=d;Iu.lanes|=f;os|=f}c=c.next}while(null!==c&&c!==u);null===s?i=r:s.next=o;Nr(r,n.memoizedState)||(Hi=!0);n.memoizedState=r;n.baseState=i;n.baseQueue=s;t.lastRenderedState=r}e=t.interleaved;if(null!==e){l=e;do{u=l.lane,Iu.lanes|=u,os|=u,l=l.next}while(l!==e)}else null===l&&(t.lanes=0);return[n.memoizedState,t.dispatch]}function Zu(e){var n=Yu(),t=n.queue;if(null===t)throw Error(a(311));t.lastRenderedReducer=e;var r=t.dispatch,l=t.pending,u=n.memoizedState;if(null!==l){t.pending=null;var i=l=l.next;do{u=e(u,i.action),i=i.next}while(i!==l);Nr(u,n.memoizedState)||(Hi=!0);n.memoizedState=u;null===n.baseQueue&&(n.baseState=u);t.lastRenderedState=u}return[u,r]}function Ju(){}function ei(e,n){var t=Iu,r=Yu(),l=n(),u=!Nr(r.memoizedState,l);u&&(r.memoizedState=l,Hi=!0);r=r.queue;di(ri.bind(null,t,r,e),[e]);if(r.getSnapshot!==n||u||null!==Vu&&Vu.memoizedState.tag&1){t.flags|=2048;ii(9,ti.bind(null,t,r,l,n),void 0,null);if(null===ns)throw Error(a(349));0!==(Ou&30)||ni(t,n,l)}return l}function ni(e,n,t){e.flags|=16384;e={getSnapshot:n,value:t};n=Iu.updateQueue;null===n?(n={lastEffect:null,stores:null},Iu.updateQueue=n,n.stores=[e]):(t=n.stores,null===t?n.stores=[e]:t.push(e))}function ti(e,n,t,r){n.value=t;n.getSnapshot=r;li(n)&&ai(e)}function ri(e,n,t){return t((function(){li(n)&&ai(e)}))}function li(e){var n=e.getSnapshot;e=e.value;try{var t=n();return!Nr(e,t)}catch(r){return!0}}function ai(e){var n=Za(e,1);null!==n&&zs(n,e,1,-1)}function ui(e){var n=qu();"function"===typeof e&&(e=e());n.memoizedState=n.baseState=e;e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Xu,lastRenderedState:e};n.queue=e;e=e.dispatch=Ei.bind(null,Iu,e);return[n.memoizedState,e]}function ii(e,n,t,r){e={tag:e,create:n,destroy:t,deps:r,next:null};n=Iu.updateQueue;null===n?(n={lastEffect:null,stores:null},Iu.updateQueue=n,n.lastEffect=e.next=e):(t=n.lastEffect,null===t?n.lastEffect=e.next=e:(r=t.next,t.next=e,e.next=r,n.lastEffect=e));return e}function oi(){return Yu().memoizedState}function si(e,n,t,r){var l=qu();Iu.flags|=e;l.memoizedState=ii(1|n,t,void 0,void 0===r?null:r)}function ci(e,n,t,r){var l=Yu();r=void 0===r?null:r;var a=void 0;if(null!==Uu){var u=Uu.memoizedState;a=u.destroy;if(null!==r&&ju(r,u.deps)){l.memoizedState=ii(n,t,a,r);return}}Iu.flags|=e;l.memoizedState=ii(1|n,t,a,r)}function fi(e,n){return si(8390656,8,e,n)}function di(e,n){return ci(2048,8,e,n)}function pi(e,n){return ci(4,2,e,n)}function mi(e,n){return ci(4,4,e,n)}function hi(e,n){if("function"===typeof n)return e=e(),n(e),function(){n(null)};if(null!==n&&void 0!==n)return e=e(),n.current=e,function(){n.current=null}}function gi(e,n,t){t=null!==t&&void 0!==t?t.concat([e]):null;return ci(4,4,hi.bind(null,n,e),t)}function vi(){}function yi(e,n){var t=Yu();n=void 0===n?null:n;var r=t.memoizedState;if(null!==r&&null!==n&&ju(n,r[1]))return r[0];t.memoizedState=[e,n];return e}function bi(e,n){var t=Yu();n=void 0===n?null:n;var r=t.memoizedState;if(null!==r&&null!==n&&ju(n,r[1]))return r[0];e=e();t.memoizedState=[e,n];return e}function ki(e,n,t){if(0===(Ou&21))return e.baseState&&(e.baseState=!1,Hi=!0),e.memoizedState=t;Nr(t,n)||(t=En(),Iu.lanes|=t,os|=t,e.baseState=!0);return n}function wi(e,n){var t=Pn;Pn=0!==t&&4>t?t:4;e(!0);var r=Ru.transition;Ru.transition={};try{e(!1),n()}finally{Pn=t,Ru.transition=r}}function Si(){return Yu().memoizedState}function xi(e,n,t){var r=Ns(e);t={lane:r,action:t,hasEagerState:!1,eagerState:null,next:null};if(Ci(e))_i(n,t);else if(t=Ga(e,n,t,r),null!==t){var l=_s();zs(t,e,r,l);Ni(t,n,r)}}function Ei(e,n,t){var r=Ns(e),l={lane:r,action:t,hasEagerState:!1,eagerState:null,next:null};if(Ci(e))_i(n,l);else{var a=e.alternate;if(0===e.lanes&&(null===a||0===a.lanes)&&(a=n.lastRenderedReducer,null!==a))try{var u=n.lastRenderedState,i=a(u,t);l.hasEagerState=!0;l.eagerState=i;if(Nr(i,u)){var o=n.interleaved;null===o?(l.next=l,Xa(n)):(l.next=o.next,o.next=l);n.interleaved=l;return}}catch(s){}finally{}t=Ga(e,n,l,r);null!==t&&(l=_s(),zs(t,e,r,l),Ni(t,n,r))}}function Ci(e){var n=e.alternate;return e===Iu||null!==n&&n===Iu}function _i(e,n){Bu=Au=!0;var t=e.pending;null===t?n.next=n:(n.next=t.next,t.next=n);e.pending=n}function Ni(e,n,t){if(0!==(t&4194240)){var r=n.lanes;r&=e.pendingLanes;t|=r;n.lanes=t;zn(e,t)}}var zi={readContext:qa,useCallback:Qu,useContext:Qu,useEffect:Qu,useImperativeHandle:Qu,useInsertionEffect:Qu,useLayoutEffect:Qu,useMemo:Qu,useReducer:Qu,useRef:Qu,useState:Qu,useDebugValue:Qu,useDeferredValue:Qu,useTransition:Qu,useMutableSource:Qu,useSyncExternalStore:Qu,useId:Qu,unstable_isNewReconciler:!1},Pi={readContext:qa,useCallback:function(e,n){qu().memoizedState=[e,void 0===n?null:n];return e},useContext:qa,useEffect:fi,useImperativeHandle:function(e,n,t){t=null!==t&&void 0!==t?t.concat([e]):null;return si(4194308,4,hi.bind(null,n,e),t)},useLayoutEffect:function(e,n){return si(4194308,4,e,n)},useInsertionEffect:function(e,n){return si(4,2,e,n)},useMemo:function(e,n){var t=qu();n=void 0===n?null:n;e=e();t.memoizedState=[e,n];return e},useReducer:function(e,n,t){var r=qu();n=void 0!==t?t(n):n;r.memoizedState=r.baseState=n;e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:n};r.queue=e;e=e.dispatch=xi.bind(null,Iu,e);return[r.memoizedState,e]},useRef:function(e){var n=qu();e={current:e};return n.memoizedState=e},useState:ui,useDebugValue:vi,useDeferredValue:function(e){return qu().memoizedState=e},useTransition:function(){var e=ui(!1),n=e[0];e=wi.bind(null,e[1]);qu().memoizedState=e;return[n,e]},useMutableSource:function(){},useSyncExternalStore:function(e,n,t){var r=Iu,l=qu();if(Na){if(void 0===t)throw Error(a(407));t=t()}else{t=n();if(null===ns)throw Error(a(349));0!==(Ou&30)||ni(r,n,t)}l.memoizedState=t;var u={value:t,getSnapshot:n};l.queue=u;fi(ri.bind(null,r,u,e),[e]);r.flags|=2048;ii(9,ti.bind(null,r,u,t,n),void 0,null);return t},useId:function(){var e=qu(),n=ns.identifierPrefix;if(Na){var t=ka;var r=ba;t=(r&~(1<<32-pn(r)-1)).toString(32)+t;n=":"+n+"R"+t;t=Hu++;0<t&&(n+="H"+t.toString(32));n+=":"}else t=Wu++,n=":"+n+"r"+t.toString(32)+":";return e.memoizedState=n},unstable_isNewReconciler:!1},Ti={readContext:qa,useCallback:yi,useContext:qa,useEffect:di,useImperativeHandle:gi,useInsertionEffect:pi,useLayoutEffect:mi,useMemo:bi,useReducer:Gu,useRef:oi,useState:function(){return Gu(Xu)},useDebugValue:vi,useDeferredValue:function(e){var n=Yu();return ki(n,Uu.memoizedState,e)},useTransition:function(){var e=Gu(Xu)[0],n=Yu().memoizedState;return[e,n]},useMutableSource:Ju,useSyncExternalStore:ei,useId:Si,unstable_isNewReconciler:!1},Li={readContext:qa,useCallback:yi,useContext:qa,useEffect:di,useImperativeHandle:gi,useInsertionEffect:pi,useLayoutEffect:mi,useMemo:bi,useReducer:Zu,useRef:oi,useState:function(){return Zu(Xu)},useDebugValue:vi,useDeferredValue:function(e){var n=Yu();return null===Uu?n.memoizedState=e:ki(n,Uu.memoizedState,e)},useTransition:function(){var e=Zu(Xu)[0],n=Yu().memoizedState;return[e,n]},useMutableSource:Ju,useSyncExternalStore:ei,useId:Si,unstable_isNewReconciler:!1};function Mi(e,n){try{var t="",r=n;do{t+=Q(r),r=r.return}while(r);var l=t}catch(a){l="\nError generating stack: "+a.message+"\n"+a.stack}return{value:e,source:n,stack:l,digest:null}}function Fi(e,n,t){return{value:e,source:null,stack:null!=t?t:null,digest:null!=n?n:null}}function Di(e,n){try{console.error(n.value)}catch(t){setTimeout((function(){throw t}))}}var Ri="function"===typeof WeakMap?WeakMap:Map;function Oi(e,n,t){t=tu(-1,t);t.tag=3;t.payload={element:null};var r=n.value;t.callback=function(){gs||(gs=!0,vs=r);Di(e,n)};return t}function Ii(e,n,t){t=tu(-1,t);t.tag=3;var r=e.type.getDerivedStateFromError;if("function"===typeof r){var l=n.value;t.payload=function(){return r(l)};t.callback=function(){Di(e,n)}}var a=e.stateNode;null!==a&&"function"===typeof a.componentDidCatch&&(t.callback=function(){Di(e,n);"function"!==typeof r&&(null===ys?ys=new Set([this]):ys.add(this));var t=n.stack;this.componentDidCatch(n.value,{componentStack:null!==t?t:""})});return t}function Ui(e,n,t){var r=e.pingCache;if(null===r){r=e.pingCache=new Ri;var l=new Set;r.set(n,l)}else l=r.get(n),void 0===l&&(l=new Set,r.set(n,l));l.has(t)||(l.add(t),e=Js.bind(null,e,n,t),n.then(e,e))}function Vi(e){do{var n;if(n=13===e.tag)n=e.memoizedState,n=null!==n?null!==n.dehydrated?!0:!1:!0;if(n)return e;e=e.return}while(null!==e);return null}function Ai(e,n,t,r,l){if(0===(e.mode&1))return e===n?e.flags|=65536:(e.flags|=128,t.flags|=131072,t.flags&=-52805,1===t.tag&&(null===t.alternate?t.tag=17:(n=tu(-1,1),n.tag=2,ru(t,n,1))),t.lanes|=1),e;e.flags|=65536;e.lanes=l;return e}var Bi=x.ReactCurrentOwner,Hi=!1;function Wi(e,n,t,r){n.child=null===e?ku(n,null,t,r):bu(n,e.child,t,r)}function Qi(e,n,t,r,l){t=t.render;var a=n.ref;Ka(n,l);r=$u(e,n,t,r,a,l);t=Ku();if(null!==e&&!Hi)return n.updateQueue=e.updateQueue,n.flags&=-2053,e.lanes&=~l,co(e,n,l);Na&&t&&xa(n);n.flags|=1;Wi(e,n,r,l);return n.child}function ji(e,n,t,r,l){if(null===e){var a=t.type;if("function"===typeof a&&!ic(a)&&void 0===a.defaultProps&&null===t.compare&&void 0===t.defaultProps)return n.tag=15,n.type=a,$i(e,n,a,r,l);e=cc(t.type,null,r,n,n.mode,l);e.ref=n.ref;e.return=n;return n.child=e}a=e.child;if(0===(e.lanes&l)){var u=a.memoizedProps;t=t.compare;t=null!==t?t:zr;if(t(u,r)&&e.ref===n.ref)return co(e,n,l)}n.flags|=1;e=sc(a,r);e.ref=n.ref;e.return=n;return n.child=e}function $i(e,n,t,r,l){if(null!==e){var a=e.memoizedProps;if(zr(a,r)&&e.ref===n.ref)if(Hi=!1,n.pendingProps=r=a,0!==(e.lanes&l))0!==(e.flags&131072)&&(Hi=!0);else return n.lanes=e.lanes,co(e,n,l)}return Yi(e,n,t,r,l)}function Ki(e,n,t){var r=n.pendingProps,l=r.children,a=null!==e?e.memoizedState:null;if("hidden"===r.mode)if(0===(n.mode&1))n.memoizedState={baseLanes:0,cachePool:null,transitions:null},ql(as,ls),ls|=t;else{if(0===(t&1073741824))return e=null!==a?a.baseLanes|t:t,n.lanes=n.childLanes=1073741824,n.memoizedState={baseLanes:e,cachePool:null,transitions:null},n.updateQueue=null,ql(as,ls),ls|=e,null;n.memoizedState={baseLanes:0,cachePool:null,transitions:null};r=null!==a?a.baseLanes:t;ql(as,ls);ls|=r}else null!==a?(r=a.baseLanes|t,n.memoizedState=null):r=t,ql(as,ls),ls|=r;Wi(e,n,l,t);return n.child}function qi(e,n){var t=n.ref;if(null===e&&null!==t||null!==e&&e.ref!==t)n.flags|=512,n.flags|=2097152}function Yi(e,n,t,r,l){var a=ea(t)?Zl:Xl.current;a=Jl(n,a);Ka(n,l);t=$u(e,n,t,r,a,l);r=Ku();if(null!==e&&!Hi)return n.updateQueue=e.updateQueue,n.flags&=-2053,e.lanes&=~l,co(e,n,l);Na&&r&&xa(n);n.flags|=1;Wi(e,n,t,l);return n.child}function Xi(e,n,t,r,l){if(ea(t)){var a=!0;la(n)}else a=!1;Ka(n,l);if(null===n.stateNode)so(e,n),du(n,t,r),mu(n,t,r,l),r=!0;else if(null===e){var u=n.stateNode,i=n.memoizedProps;u.props=i;var o=u.context,s=t.contextType;"object"===typeof s&&null!==s?s=qa(s):(s=ea(t)?Zl:Xl.current,s=Jl(n,s));var c=t.getDerivedStateFromProps,f="function"===typeof c||"function"===typeof u.getSnapshotBeforeUpdate;f||"function"!==typeof u.UNSAFE_componentWillReceiveProps&&"function"!==typeof u.componentWillReceiveProps||(i!==r||o!==s)&&pu(n,u,r,s);Ja=!1;var d=n.memoizedState;u.state=d;uu(n,r,u,l);o=n.memoizedState;i!==r||d!==o||Gl.current||Ja?("function"===typeof c&&(su(n,t,c,r),o=n.memoizedState),(i=Ja||fu(n,t,i,r,d,o,s))?(f||"function"!==typeof u.UNSAFE_componentWillMount&&"function"!==typeof u.componentWillMount||("function"===typeof u.componentWillMount&&u.componentWillMount(),"function"===typeof u.UNSAFE_componentWillMount&&u.UNSAFE_componentWillMount()),"function"===typeof u.componentDidMount&&(n.flags|=4194308)):("function"===typeof u.componentDidMount&&(n.flags|=4194308),n.memoizedProps=r,n.memoizedState=o),u.props=r,u.state=o,u.context=s,r=i):("function"===typeof u.componentDidMount&&(n.flags|=4194308),r=!1)}else{u=n.stateNode;nu(e,n);i=n.memoizedProps;s=n.type===n.elementType?i:Va(n.type,i);u.props=s;f=n.pendingProps;d=u.context;o=t.contextType;"object"===typeof o&&null!==o?o=qa(o):(o=ea(t)?Zl:Xl.current,o=Jl(n,o));var p=t.getDerivedStateFromProps;(c="function"===typeof p||"function"===typeof u.getSnapshotBeforeUpdate)||"function"!==typeof u.UNSAFE_componentWillReceiveProps&&"function"!==typeof u.componentWillReceiveProps||(i!==f||d!==o)&&pu(n,u,r,o);Ja=!1;d=n.memoizedState;u.state=d;uu(n,r,u,l);var m=n.memoizedState;i!==f||d!==m||Gl.current||Ja?("function"===typeof p&&(su(n,t,p,r),m=n.memoizedState),(s=Ja||fu(n,t,s,r,d,m,o)||!1)?(c||"function"!==typeof u.UNSAFE_componentWillUpdate&&"function"!==typeof u.componentWillUpdate||("function"===typeof u.componentWillUpdate&&u.componentWillUpdate(r,m,o),"function"===typeof u.UNSAFE_componentWillUpdate&&u.UNSAFE_componentWillUpdate(r,m,o)),"function"===typeof u.componentDidUpdate&&(n.flags|=4),"function"===typeof u.getSnapshotBeforeUpdate&&(n.flags|=1024)):("function"!==typeof u.componentDidUpdate||i===e.memoizedProps&&d===e.memoizedState||(n.flags|=4),"function"!==typeof u.getSnapshotBeforeUpdate||i===e.memoizedProps&&d===e.memoizedState||(n.flags|=1024),n.memoizedProps=r,n.memoizedState=m),u.props=r,u.state=m,u.context=o,r=s):("function"!==typeof u.componentDidUpdate||i===e.memoizedProps&&d===e.memoizedState||(n.flags|=4),"function"!==typeof u.getSnapshotBeforeUpdate||i===e.memoizedProps&&d===e.memoizedState||(n.flags|=1024),r=!1)}return Gi(e,n,t,r,a,l)}function Gi(e,n,t,r,l,a){qi(e,n);var u=0!==(n.flags&128);if(!r&&!u)return l&&aa(n,t,!1),co(e,n,a);r=n.stateNode;Bi.current=n;var i=u&&"function"!==typeof t.getDerivedStateFromError?null:r.render();n.flags|=1;null!==e&&u?(n.child=bu(n,e.child,null,a),n.child=bu(n,null,i,a)):Wi(e,n,i,a);n.memoizedState=r.state;l&&aa(n,t,!0);return n.child}function Zi(e){var n=e.stateNode;n.pendingContext?ta(e,n.pendingContext,n.pendingContext!==n.context):n.context&&ta(e,n.context,!1);_u(e,n.containerInfo)}function Ji(e,n,t,r,l){Oa();Ia(l);n.flags|=256;Wi(e,n,t,r);return n.child}var eo={dehydrated:null,treeContext:null,retryLane:0};function no(e){return{baseLanes:e,cachePool:null,transitions:null}}function to(e,n,t){var r=n.pendingProps,l=Tu.current,a=!1,u=0!==(n.flags&128),i;(i=u)||(i=null!==e&&null===e.memoizedState?!1:0!==(l&2));if(i)a=!0,n.flags&=-129;else if(null===e||null!==e.memoizedState)l|=1;ql(Tu,l&1);if(null===e){Ma(n);e=n.memoizedState;if(null!==e&&(e=e.dehydrated,null!==e))return 0===(n.mode&1)?n.lanes=1:"$!"===e.data?n.lanes=8:n.lanes=1073741824,null;u=r.children;e=r.fallback;return a?(r=n.mode,a=n.child,u={mode:"hidden",children:u},0===(r&1)&&null!==a?(a.childLanes=0,a.pendingProps=u):a=dc(u,r,0,null),e=fc(e,r,t,null),a.return=n,e.return=n,a.sibling=e,n.child=a,n.child.memoizedState=no(t),n.memoizedState=eo,e):ro(n,u)}l=e.memoizedState;if(null!==l&&(i=l.dehydrated,null!==i))return ao(e,n,u,r,i,l,t);if(a){a=r.fallback;u=n.mode;l=e.child;i=l.sibling;var o={mode:"hidden",children:r.children};0===(u&1)&&n.child!==l?(r=n.child,r.childLanes=0,r.pendingProps=o,n.deletions=null):(r=sc(l,o),r.subtreeFlags=l.subtreeFlags&14680064);null!==i?a=sc(i,a):(a=fc(a,u,t,null),a.flags|=2);a.return=n;r.return=n;r.sibling=a;n.child=r;r=a;a=n.child;u=e.child.memoizedState;u=null===u?no(t):{baseLanes:u.baseLanes|t,cachePool:null,transitions:u.transitions};a.memoizedState=u;a.childLanes=e.childLanes&~t;n.memoizedState=eo;return r}a=e.child;e=a.sibling;r=sc(a,{mode:"visible",children:r.children});0===(n.mode&1)&&(r.lanes=t);r.return=n;r.sibling=null;null!==e&&(t=n.deletions,null===t?(n.deletions=[e],n.flags|=16):t.push(e));n.child=r;n.memoizedState=null;return r}function ro(e,n){n=dc({mode:"visible",children:n},e.mode,0,null);n.return=e;return e.child=n}function lo(e,n,t,r){null!==r&&Ia(r);bu(n,e.child,null,t);e=ro(n,n.pendingProps.children);e.flags|=2;n.memoizedState=null;return e}function ao(e,n,t,r,l,u,i){if(t){if(n.flags&256)return n.flags&=-257,r=Fi(Error(a(422))),lo(e,n,i,r);if(null!==n.memoizedState)return n.child=e.child,n.flags|=128,null;u=r.fallback;l=n.mode;r=dc({mode:"visible",children:r.children},l,0,null);u=fc(u,l,i,null);u.flags|=2;r.return=n;u.return=n;r.sibling=u;n.child=r;0!==(n.mode&1)&&bu(n,e.child,null,i);n.child.memoizedState=no(i);n.memoizedState=eo;return u}if(0===(n.mode&1))return lo(e,n,i,null);if("$!"===l.data){r=l.nextSibling&&l.nextSibling.dataset;if(r)var o=r.dgst;r=o;u=Error(a(419));r=Fi(u,r,void 0);return lo(e,n,i,r)}o=0!==(i&e.childLanes);if(Hi||o){r=ns;if(null!==r){switch(i&-i){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=0!==(l&(r.suspendedLanes|i))?0:l;0!==l&&l!==u.retryLane&&(u.retryLane=l,Za(e,l),zs(r,e,l,-1))}Hs();r=Fi(Error(a(421)));return lo(e,n,i,r)}if("$?"===l.data)return n.flags|=128,n.child=e.child,n=nc.bind(null,e),l._reactRetry=n,null;e=u.treeContext;_a=Ll(l.nextSibling);Ca=n;Na=!0;za=null;null!==e&&(ga[va++]=ba,ga[va++]=ka,ga[va++]=ya,ba=e.id,ka=e.overflow,ya=n);n=ro(n,r.children);n.flags|=4096;return n}function uo(e,n,t){e.lanes|=n;var r=e.alternate;null!==r&&(r.lanes|=n);$a(e.return,n,t)}function io(e,n,t,r,l){var a=e.memoizedState;null===a?e.memoizedState={isBackwards:n,rendering:null,renderingStartTime:0,last:r,tail:t,tailMode:l}:(a.isBackwards=n,a.rendering=null,a.renderingStartTime=0,a.last=r,a.tail=t,a.tailMode=l)}function oo(e,n,t){var r=n.pendingProps,l=r.revealOrder,a=r.tail;Wi(e,n,r.children,t);r=Tu.current;if(0!==(r&2))r=r&1|2,n.flags|=128;else{if(null!==e&&0!==(e.flags&128))e:for(e=n.child;null!==e;){if(13===e.tag)null!==e.memoizedState&&uo(e,t,n);else if(19===e.tag)uo(e,t,n);else if(null!==e.child){e.child.return=e;e=e.child;continue}if(e===n)break e;for(;null===e.sibling;){if(null===e.return||e.return===n)break e;e=e.return}e.sibling.return=e.return;e=e.sibling}r&=1}ql(Tu,r);if(0===(n.mode&1))n.memoizedState=null;else switch(l){case"forwards":t=n.child;for(l=null;null!==t;)e=t.alternate,null!==e&&null===Lu(e)&&(l=t),t=t.sibling;t=l;null===t?(l=n.child,n.child=null):(l=t.sibling,t.sibling=null);io(n,!1,l,t,a);break;case"backwards":t=null;l=n.child;for(n.child=null;null!==l;){e=l.alternate;if(null!==e&&null===Lu(e)){n.child=l;break}e=l.sibling;l.sibling=t;t=l;l=e}io(n,!0,t,null,a);break;case"together":io(n,!1,null,null,void 0);break;default:n.memoizedState=null}return n.child}function so(e,n){0===(n.mode&1)&&null!==e&&(e.alternate=null,n.alternate=null,n.flags|=2)}function co(e,n,t){null!==e&&(n.dependencies=e.dependencies);os|=n.lanes;if(0===(t&n.childLanes))return null;if(null!==e&&n.child!==e.child)throw Error(a(153));if(null!==n.child){e=n.child;t=sc(e,e.pendingProps);n.child=t;for(t.return=n;null!==e.sibling;)e=e.sibling,t=t.sibling=sc(e,e.pendingProps),t.return=n;t.sibling=null}return n.child}function fo(e,n,t){switch(n.tag){case 3:Zi(n);Oa();break;case 5:zu(n);break;case 1:ea(n.type)&&la(n);break;case 4:_u(n,n.stateNode.containerInfo);break;case 10:var r=n.type._context,l=n.memoizedProps.value;ql(Aa,r._currentValue);r._currentValue=l;break;case 13:r=n.memoizedState;if(null!==r){if(null!==r.dehydrated)return ql(Tu,Tu.current&1),n.flags|=128,null;if(0!==(t&n.child.childLanes))return to(e,n,t);ql(Tu,Tu.current&1);e=co(e,n,t);return null!==e?e.sibling:null}ql(Tu,Tu.current&1);break;case 19:r=0!==(t&n.childLanes);if(0!==(e.flags&128)){if(r)return oo(e,n,t);n.flags|=128}l=n.memoizedState;null!==l&&(l.rendering=null,l.tail=null,l.lastEffect=null);ql(Tu,Tu.current);if(r)break;else return null;case 22:case 23:return n.lanes=0,Ki(e,n,t)}return co(e,n,t)}var po,mo,ho,go;po=function(e,n){for(var t=n.child;null!==t;){if(5===t.tag||6===t.tag)e.appendChild(t.stateNode);else if(4!==t.tag&&null!==t.child){t.child.return=t;t=t.child;continue}if(t===n)break;for(;null===t.sibling;){if(null===t.return||t.return===n)return;t=t.return}t.sibling.return=t.return;t=t.sibling}};mo=function(){};ho=function(e,n,t,r){var l=e.memoizedProps;if(l!==r){e=n.stateNode;Cu(Su.current);var a=null;switch(t){case"input":l=J(e,l);r=J(e,r);a=[];break;case"select":l=V({},l,{value:void 0});r=V({},r,{value:void 0});a=[];break;case"textarea":l=ie(e,l);r=ie(e,r);a=[];break;default:"function"!==typeof l.onClick&&"function"===typeof r.onClick&&(e.onclick=wl)}we(t,r);var u;t=null;for(c in l)if(!r.hasOwnProperty(c)&&l.hasOwnProperty(c)&&null!=l[c])if("style"===c){var o=l[c];for(u in o)o.hasOwnProperty(u)&&(t||(t={}),t[u]="")}else"dangerouslySetInnerHTML"!==c&&"children"!==c&&"suppressContentEditableWarning"!==c&&"suppressHydrationWarning"!==c&&"autoFocus"!==c&&(i.hasOwnProperty(c)?a||(a=[]):(a=a||[]).push(c,null));for(c in r){var s=r[c];o=null!=l?l[c]:void 0;if(r.hasOwnProperty(c)&&s!==o&&(null!=s||null!=o))if("style"===c)if(o){for(u in o)!o.hasOwnProperty(u)||s&&s.hasOwnProperty(u)||(t||(t={}),t[u]="");for(u in s)s.hasOwnProperty(u)&&o[u]!==s[u]&&(t||(t={}),t[u]=s[u])}else t||(a||(a=[]),a.push(c,t)),t=s;else"dangerouslySetInnerHTML"===c?(s=s?s.__html:void 0,o=o?o.__html:void 0,null!=s&&o!==s&&(a=a||[]).push(c,s)):"children"===c?"string"!==typeof s&&"number"!==typeof s||(a=a||[]).push(c,""+s):"suppressContentEditableWarning"!==c&&"suppressHydrationWarning"!==c&&(i.hasOwnProperty(c)?(null!=s&&"onScroll"===c&&il("scroll",e),a||o===s||(a=[])):(a=a||[]).push(c,s))}t&&(a=a||[]).push("style",t);var c=a;if(n.updateQueue=c)n.flags|=4}};go=function(e,n,t,r){t!==r&&(n.flags|=4)};function vo(e,n){if(!Na)switch(e.tailMode){case"hidden":n=e.tail;for(var t=null;null!==n;)null!==n.alternate&&(t=n),n=n.sibling;null===t?e.tail=null:t.sibling=null;break;case"collapsed":t=e.tail;for(var r=null;null!==t;)null!==t.alternate&&(r=t),t=t.sibling;null===r?n||null===e.tail?e.tail=null:e.tail.sibling=null:r.sibling=null}}function yo(e){var n=null!==e.alternate&&e.alternate.child===e.child,t=0,r=0;if(n)for(var l=e.child;null!==l;)t|=l.lanes|l.childLanes,r|=l.subtreeFlags&14680064,r|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;null!==l;)t|=l.lanes|l.childLanes,r|=l.subtreeFlags,r|=l.flags,l.return=e,l=l.sibling;e.subtreeFlags|=r;e.childLanes=t;return n}function bo(e,n,t){var r=n.pendingProps;Ea(n);switch(n.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return yo(n),null;case 1:return ea(n.type)&&na(),yo(n),null;case 3:r=n.stateNode;Nu();Kl(Gl);Kl(Xl);Fu();r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null);if(null===e||null===e.child)Da(n)?n.flags|=4:null===e||e.memoizedState.isDehydrated&&0===(n.flags&256)||(n.flags|=1024,null!==za&&(Ms(za),za=null));mo(e,n);yo(n);return null;case 5:Pu(n);var l=Cu(Eu.current);t=n.type;if(null!==e&&null!=n.stateNode)ho(e,n,t,r,l),e.ref!==n.ref&&(n.flags|=512,n.flags|=2097152);else{if(!r){if(null===n.stateNode)throw Error(a(166));yo(n);return null}e=Cu(Su.current);if(Da(n)){r=n.stateNode;t=n.type;var u=n.memoizedProps;r[Dl]=n;r[Rl]=u;e=0!==(n.mode&1);switch(t){case"dialog":il("cancel",r);il("close",r);break;case"iframe":case"object":case"embed":il("load",r);break;case"video":case"audio":for(l=0;l<rl.length;l++)il(rl[l],r);break;case"source":il("error",r);break;case"img":case"image":case"link":il("error",r);il("load",r);break;case"details":il("toggle",r);break;case"input":ee(r,u);il("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!u.multiple};il("invalid",r);break;case"textarea":oe(r,u),il("invalid",r)}we(t,u);l=null;for(var o in u)if(u.hasOwnProperty(o)){var s=u[o];"children"===o?"string"===typeof s?r.textContent!==s&&(!0!==u.suppressHydrationWarning&&kl(r.textContent,s,e),l=["children",s]):"number"===typeof s&&r.textContent!==""+s&&(!0!==u.suppressHydrationWarning&&kl(r.textContent,s,e),l=["children",""+s]):i.hasOwnProperty(o)&&null!=s&&"onScroll"===o&&il("scroll",r)}switch(t){case"input":X(r);re(r,u,!0);break;case"textarea":X(r);ce(r);break;case"select":case"option":break;default:"function"===typeof u.onClick&&(r.onclick=wl)}r=l;n.updateQueue=r;null!==r&&(n.flags|=4)}else{o=9===l.nodeType?l:l.ownerDocument;"http://www.w3.org/1999/xhtml"===e&&(e=fe(t));"http://www.w3.org/1999/xhtml"===e?"script"===t?(e=o.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):"string"===typeof r.is?e=o.createElement(t,{is:r.is}):(e=o.createElement(t),"select"===t&&(o=e,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):e=o.createElementNS(e,t);e[Dl]=n;e[Rl]=r;po(e,n,!1,!1);n.stateNode=e;e:{o=Se(t,r);switch(t){case"dialog":il("cancel",e);il("close",e);l=r;break;case"iframe":case"object":case"embed":il("load",e);l=r;break;case"video":case"audio":for(l=0;l<rl.length;l++)il(rl[l],e);l=r;break;case"source":il("error",e);l=r;break;case"img":case"image":case"link":il("error",e);il("load",e);l=r;break;case"details":il("toggle",e);l=r;break;case"input":ee(e,r);l=J(e,r);il("invalid",e);break;case"option":l=r;break;case"select":e._wrapperState={wasMultiple:!!r.multiple};l=V({},r,{value:void 0});il("invalid",e);break;case"textarea":oe(e,r);l=ie(e,r);il("invalid",e);break;default:l=r}we(t,l);s=l;for(u in s)if(s.hasOwnProperty(u)){var c=s[u];"style"===u?be(e,c):"dangerouslySetInnerHTML"===u?(c=c?c.__html:void 0,null!=c&&me(e,c)):"children"===u?"string"===typeof c?("textarea"!==t||""!==c)&&he(e,c):"number"===typeof c&&he(e,""+c):"suppressContentEditableWarning"!==u&&"suppressHydrationWarning"!==u&&"autoFocus"!==u&&(i.hasOwnProperty(u)?null!=c&&"onScroll"===u&&il("scroll",e):null!=c&&S(e,u,c,o))}switch(t){case"input":X(e);re(e,r,!1);break;case"textarea":X(e);ce(e);break;case"option":null!=r.value&&e.setAttribute("value",""+K(r.value));break;case"select":e.multiple=!!r.multiple;u=r.value;null!=u?ue(e,!!r.multiple,u,!1):null!=r.defaultValue&&ue(e,!!r.multiple,r.defaultValue,!0);break;default:"function"===typeof l.onClick&&(e.onclick=wl)}switch(t){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(n.flags|=4)}null!==n.ref&&(n.flags|=512,n.flags|=2097152)}yo(n);return null;case 6:if(e&&null!=n.stateNode)go(e,n,e.memoizedProps,r);else{if("string"!==typeof r&&null===n.stateNode)throw Error(a(166));t=Cu(Eu.current);Cu(Su.current);if(Da(n)){r=n.stateNode;t=n.memoizedProps;r[Dl]=n;if(u=r.nodeValue!==t)if(e=Ca,null!==e)switch(e.tag){case 3:kl(r.nodeValue,t,0!==(e.mode&1));break;case 5:!0!==e.memoizedProps.suppressHydrationWarning&&kl(r.nodeValue,t,0!==(e.mode&1))}u&&(n.flags|=4)}else r=(9===t.nodeType?t:t.ownerDocument).createTextNode(r),r[Dl]=n,n.stateNode=r}yo(n);return null;case 13:Kl(Tu);r=n.memoizedState;if(null===e||null!==e.memoizedState&&null!==e.memoizedState.dehydrated){if(Na&&null!==_a&&0!==(n.mode&1)&&0===(n.flags&128))Ra(),Oa(),n.flags|=98560,u=!1;else if(u=Da(n),null!==r&&null!==r.dehydrated){if(null===e){if(!u)throw Error(a(318));u=n.memoizedState;u=null!==u?u.dehydrated:null;if(!u)throw Error(a(317));u[Dl]=n}else Oa(),0===(n.flags&128)&&(n.memoizedState=null),n.flags|=4;yo(n);u=!1}else null!==za&&(Ms(za),za=null),u=!0;if(!u)return n.flags&65536?n:null}if(0!==(n.flags&128))return n.lanes=t,n;r=null!==r;r!==(null!==e&&null!==e.memoizedState)&&r&&(n.child.flags|=8192,0!==(n.mode&1)&&(null===e||0!==(Tu.current&1)?0===us&&(us=3):Hs()));null!==n.updateQueue&&(n.flags|=4);yo(n);return null;case 4:return Nu(),mo(e,n),null===e&&cl(n.stateNode.containerInfo),yo(n),null;case 10:return ja(n.type._context),yo(n),null;case 17:return ea(n.type)&&na(),yo(n),null;case 19:Kl(Tu);u=n.memoizedState;if(null===u)return yo(n),null;r=0!==(n.flags&128);o=u.rendering;if(null===o)if(r)vo(u,!1);else{if(0!==us||null!==e&&0!==(e.flags&128))for(e=n.child;null!==e;){o=Lu(e);if(null!==o){n.flags|=128;vo(u,!1);r=o.updateQueue;null!==r&&(n.updateQueue=r,n.flags|=4);n.subtreeFlags=0;r=t;for(t=n.child;null!==t;)u=t,e=r,u.flags&=14680066,o=u.alternate,null===o?(u.childLanes=0,u.lanes=e,u.child=null,u.subtreeFlags=0,u.memoizedProps=null,u.memoizedState=null,u.updateQueue=null,u.dependencies=null,u.stateNode=null):(u.childLanes=o.childLanes,u.lanes=o.lanes,u.child=o.child,u.subtreeFlags=0,u.deletions=null,u.memoizedProps=o.memoizedProps,u.memoizedState=o.memoizedState,u.updateQueue=o.updateQueue,u.type=o.type,e=o.dependencies,u.dependencies=null===e?null:{lanes:e.lanes,firstContext:e.firstContext}),t=t.sibling;ql(Tu,Tu.current&1|2);return n.child}e=e.sibling}null!==u.tail&&tn()>ms&&(n.flags|=128,r=!0,vo(u,!1),n.lanes=4194304)}else{if(!r)if(e=Lu(o),null!==e){if(n.flags|=128,r=!0,t=e.updateQueue,null!==t&&(n.updateQueue=t,n.flags|=4),vo(u,!0),null===u.tail&&"hidden"===u.tailMode&&!o.alternate&&!Na)return yo(n),null}else 2*tn()-u.renderingStartTime>ms&&1073741824!==t&&(n.flags|=128,r=!0,vo(u,!1),n.lanes=4194304);u.isBackwards?(o.sibling=n.child,n.child=o):(t=u.last,null!==t?t.sibling=o:n.child=o,u.last=o)}if(null!==u.tail)return n=u.tail,u.rendering=n,u.tail=n.sibling,u.renderingStartTime=tn(),n.sibling=null,t=Tu.current,ql(Tu,r?t&1|2:t&1),n;yo(n);return null;case 22:case 23:return Us(),r=null!==n.memoizedState,null!==e&&null!==e.memoizedState!==r&&(n.flags|=8192),r&&0!==(n.mode&1)?0!==(ls&1073741824)&&(yo(n),n.subtreeFlags&6&&(n.flags|=8192)):yo(n),null;case 24:return null;case 25:return null}throw Error(a(156,n.tag))}function ko(e,n){Ea(n);switch(n.tag){case 1:return ea(n.type)&&na(),e=n.flags,e&65536?(n.flags=e&-65537|128,n):null;case 3:return Nu(),Kl(Gl),Kl(Xl),Fu(),e=n.flags,0!==(e&65536)&&0===(e&128)?(n.flags=e&-65537|128,n):null;case 5:return Pu(n),null;case 13:Kl(Tu);e=n.memoizedState;if(null!==e&&null!==e.dehydrated){if(null===n.alternate)throw Error(a(340));Oa()}e=n.flags;return e&65536?(n.flags=e&-65537|128,n):null;case 19:return Kl(Tu),null;case 4:return Nu(),null;case 10:return ja(n.type._context),null;case 22:case 23:return Us(),null;case 24:return null;default:return null}}var wo=!1,So=!1,xo="function"===typeof WeakSet?WeakSet:Set,Eo=null;function Co(e,n){var t=e.ref;if(null!==t)if("function"===typeof t)try{t(null)}catch(r){Zs(e,n,r)}else t.current=null}function _o(e,n,t){try{t()}catch(r){Zs(e,n,r)}}var No=!1;function zo(e,n){Sl=nt;e=Mr();if(Fr(e)){if("selectionStart"in e)var t={start:e.selectionStart,end:e.selectionEnd};else e:{t=(t=e.ownerDocument)&&t.defaultView||window;var r=t.getSelection&&t.getSelection();if(r&&0!==r.rangeCount){t=r.anchorNode;var l=r.anchorOffset,u=r.focusNode;r=r.focusOffset;try{t.nodeType,u.nodeType}catch(w){t=null;break e}var i=0,o=-1,s=-1,c=0,f=0,d=e,p=null;n:for(;;){for(var m;;){d!==t||0!==l&&3!==d.nodeType||(o=i+l);d!==u||0!==r&&3!==d.nodeType||(s=i+r);3===d.nodeType&&(i+=d.nodeValue.length);if(null===(m=d.firstChild))break;p=d;d=m}for(;;){if(d===e)break n;p===t&&++c===l&&(o=i);p===u&&++f===r&&(s=i);if(null!==(m=d.nextSibling))break;d=p;p=d.parentNode}d=m}t=-1===o||-1===s?null:{start:o,end:s}}else t=null}t=t||{start:0,end:0}}else t=null;xl={focusedElem:e,selectionRange:t};nt=!1;for(Eo=n;null!==Eo;)if(n=Eo,e=n.child,0!==(n.subtreeFlags&1028)&&null!==e)e.return=n,Eo=e;else for(;null!==Eo;){n=Eo;try{var h=n.alternate;if(0!==(n.flags&1024))switch(n.tag){case 0:case 11:case 15:break;case 1:if(null!==h){var g=h.memoizedProps,v=h.memoizedState,y=n.stateNode,b=y.getSnapshotBeforeUpdate(n.elementType===n.type?g:Va(n.type,g),v);y.__reactInternalSnapshotBeforeUpdate=b}break;case 3:var k=n.stateNode.containerInfo;1===k.nodeType?k.textContent="":9===k.nodeType&&k.documentElement&&k.removeChild(k.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(a(163))}}catch(w){Zs(n,n.return,w)}e=n.sibling;if(null!==e){e.return=n.return;Eo=e;break}Eo=n.return}h=No;No=!1;return h}function Po(e,n,t){var r=n.updateQueue;r=null!==r?r.lastEffect:null;if(null!==r){var l=r=r.next;do{if((l.tag&e)===e){var a=l.destroy;l.destroy=void 0;void 0!==a&&_o(n,t,a)}l=l.next}while(l!==r)}}function To(e,n){n=n.updateQueue;n=null!==n?n.lastEffect:null;if(null!==n){var t=n=n.next;do{if((t.tag&e)===e){var r=t.create;t.destroy=r()}t=t.next}while(t!==n)}}function Lo(e){var n=e.ref;if(null!==n){var t=e.stateNode;switch(e.tag){case 5:e=t;break;default:e=t}"function"===typeof n?n(e):n.current=e}}function Mo(e){var n=e.alternate;null!==n&&(e.alternate=null,Mo(n));e.child=null;e.deletions=null;e.sibling=null;5===e.tag&&(n=e.stateNode,null!==n&&(delete n[Dl],delete n[Rl],delete n[Il],delete n[Ul],delete n[Vl]));e.stateNode=null;e.return=null;e.dependencies=null;e.memoizedProps=null;e.memoizedState=null;e.pendingProps=null;e.stateNode=null;e.updateQueue=null}function Fo(e){return 5===e.tag||3===e.tag||4===e.tag}function Do(e){e:for(;;){for(;null===e.sibling;){if(null===e.return||Fo(e.return))return null;e=e.return}e.sibling.return=e.return;for(e=e.sibling;5!==e.tag&&6!==e.tag&&18!==e.tag;){if(e.flags&2)continue e;if(null===e.child||4===e.tag)continue e;else e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Ro(e,n,t){var r=e.tag;if(5===r||6===r)e=e.stateNode,n?8===t.nodeType?t.parentNode.insertBefore(e,n):t.insertBefore(e,n):(8===t.nodeType?(n=t.parentNode,n.insertBefore(e,t)):(n=t,n.appendChild(e)),t=t._reactRootContainer,null!==t&&void 0!==t||null!==n.onclick||(n.onclick=wl));else if(4!==r&&(e=e.child,null!==e))for(Ro(e,n,t),e=e.sibling;null!==e;)Ro(e,n,t),e=e.sibling}function Oo(e,n,t){var r=e.tag;if(5===r||6===r)e=e.stateNode,n?t.insertBefore(e,n):t.appendChild(e);else if(4!==r&&(e=e.child,null!==e))for(Oo(e,n,t),e=e.sibling;null!==e;)Oo(e,n,t),e=e.sibling}var Io=null,Uo=!1;function Vo(e,n,t){for(t=t.child;null!==t;)Ao(e,n,t),t=t.sibling}function Ao(e,n,t){if(fn&&"function"===typeof fn.onCommitFiberUnmount)try{fn.onCommitFiberUnmount(cn,t)}catch(i){}switch(t.tag){case 5:So||Co(t,n);case 6:var r=Io,l=Uo;Io=null;Vo(e,n,t);Io=r;Uo=l;null!==Io&&(Uo?(e=Io,t=t.stateNode,8===e.nodeType?e.parentNode.removeChild(t):e.removeChild(t)):Io.removeChild(t.stateNode));break;case 18:null!==Io&&(Uo?(e=Io,t=t.stateNode,8===e.nodeType?Tl(e.parentNode,t):1===e.nodeType&&Tl(e,t),Jn(e)):Tl(Io,t.stateNode));break;case 4:r=Io;l=Uo;Io=t.stateNode.containerInfo;Uo=!0;Vo(e,n,t);Io=r;Uo=l;break;case 0:case 11:case 14:case 15:if(!So&&(r=t.updateQueue,null!==r&&(r=r.lastEffect,null!==r))){l=r=r.next;do{var a=l,u=a.destroy;a=a.tag;void 0!==u&&(0!==(a&2)?_o(t,n,u):0!==(a&4)&&_o(t,n,u));l=l.next}while(l!==r)}Vo(e,n,t);break;case 1:if(!So&&(Co(t,n),r=t.stateNode,"function"===typeof r.componentWillUnmount))try{r.props=t.memoizedProps,r.state=t.memoizedState,r.componentWillUnmount()}catch(i){Zs(t,n,i)}Vo(e,n,t);break;case 21:Vo(e,n,t);break;case 22:t.mode&1?(So=(r=So)||null!==t.memoizedState,Vo(e,n,t),So=r):Vo(e,n,t);break;default:Vo(e,n,t)}}function Bo(e){var n=e.updateQueue;if(null!==n){e.updateQueue=null;var t=e.stateNode;null===t&&(t=e.stateNode=new xo);n.forEach((function(n){var r=tc.bind(null,e,n);t.has(n)||(t.add(n),n.then(r,r))}))}}function Ho(e,n){var t=n.deletions;if(null!==t)for(var r=0;r<t.length;r++){var l=t[r];try{var u=e,i=n,o=i;e:for(;null!==o;){switch(o.tag){case 5:Io=o.stateNode;Uo=!1;break e;case 3:Io=o.stateNode.containerInfo;Uo=!0;break e;case 4:Io=o.stateNode.containerInfo;Uo=!0;break e}o=o.return}if(null===Io)throw Error(a(160));Ao(u,i,l);Io=null;Uo=!1;var s=l.alternate;null!==s&&(s.return=null);l.return=null}catch(c){Zs(l,n,c)}}if(n.subtreeFlags&12854)for(n=n.child;null!==n;)Wo(n,e),n=n.sibling}function Wo(e,n){var t=e.alternate,r=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:Ho(n,e);Qo(e);if(r&4){try{Po(3,e,e.return),To(3,e)}catch(g){Zs(e,e.return,g)}try{Po(5,e,e.return)}catch(g){Zs(e,e.return,g)}}break;case 1:Ho(n,e);Qo(e);r&512&&null!==t&&Co(t,t.return);break;case 5:Ho(n,e);Qo(e);r&512&&null!==t&&Co(t,t.return);if(e.flags&32){var l=e.stateNode;try{he(l,"")}catch(g){Zs(e,e.return,g)}}if(r&4&&(l=e.stateNode,null!=l)){var u=e.memoizedProps,i=null!==t?t.memoizedProps:u,o=e.type,s=e.updateQueue;e.updateQueue=null;if(null!==s)try{"input"===o&&"radio"===u.type&&null!=u.name&&ne(l,u);Se(o,i);var c=Se(o,u);for(i=0;i<s.length;i+=2){var f=s[i],d=s[i+1];"style"===f?be(l,d):"dangerouslySetInnerHTML"===f?me(l,d):"children"===f?he(l,d):S(l,f,d,c)}switch(o){case"input":te(l,u);break;case"textarea":se(l,u);break;case"select":var p=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!u.multiple;var m=u.value;null!=m?ue(l,!!u.multiple,m,!1):p!==!!u.multiple&&(null!=u.defaultValue?ue(l,!!u.multiple,u.defaultValue,!0):ue(l,!!u.multiple,u.multiple?[]:"",!1))}l[Rl]=u}catch(g){Zs(e,e.return,g)}}break;case 6:Ho(n,e);Qo(e);if(r&4){if(null===e.stateNode)throw Error(a(162));l=e.stateNode;u=e.memoizedProps;try{l.nodeValue=u}catch(g){Zs(e,e.return,g)}}break;case 3:Ho(n,e);Qo(e);if(r&4&&null!==t&&t.memoizedState.isDehydrated)try{Jn(n.containerInfo)}catch(g){Zs(e,e.return,g)}break;case 4:Ho(n,e);Qo(e);break;case 13:Ho(n,e);Qo(e);l=e.child;l.flags&8192&&(u=null!==l.memoizedState,l.stateNode.isHidden=u,!u||null!==l.alternate&&null!==l.alternate.memoizedState||(ps=tn()));r&4&&Bo(e);break;case 22:f=null!==t&&null!==t.memoizedState;e.mode&1?(So=(c=So)||f,Ho(n,e),So=c):Ho(n,e);Qo(e);if(r&8192){c=null!==e.memoizedState;if((e.stateNode.isHidden=c)&&!f&&0!==(e.mode&1))for(Eo=e,f=e.child;null!==f;){for(d=Eo=f;null!==Eo;){p=Eo;m=p.child;switch(p.tag){case 0:case 11:case 14:case 15:Po(4,p,p.return);break;case 1:Co(p,p.return);var h=p.stateNode;if("function"===typeof h.componentWillUnmount){r=p;t=p.return;try{n=r,h.props=n.memoizedProps,h.state=n.memoizedState,h.componentWillUnmount()}catch(g){Zs(r,t,g)}}break;case 5:Co(p,p.return);break;case 22:if(null!==p.memoizedState){qo(d);continue}}null!==m?(m.return=p,Eo=m):qo(d)}f=f.sibling}e:for(f=null,d=e;;){if(5===d.tag){if(null===f){f=d;try{l=d.stateNode,c?(u=l.style,"function"===typeof u.setProperty?u.setProperty("display","none","important"):u.display="none"):(o=d.stateNode,s=d.memoizedProps.style,i=void 0!==s&&null!==s&&s.hasOwnProperty("display")?s.display:null,o.style.display=ye("display",i))}catch(g){Zs(e,e.return,g)}}}else if(6===d.tag){if(null===f)try{d.stateNode.nodeValue=c?"":d.memoizedProps}catch(g){Zs(e,e.return,g)}}else if((22!==d.tag&&23!==d.tag||null===d.memoizedState||d===e)&&null!==d.child){d.child.return=d;d=d.child;continue}if(d===e)break e;for(;null===d.sibling;){if(null===d.return||d.return===e)break e;f===d&&(f=null);d=d.return}f===d&&(f=null);d.sibling.return=d.return;d=d.sibling}}break;case 19:Ho(n,e);Qo(e);r&4&&Bo(e);break;case 21:break;default:Ho(n,e),Qo(e)}}function Qo(e){var n=e.flags;if(n&2){try{e:{for(var t=e.return;null!==t;){if(Fo(t)){var r=t;break e}t=t.return}throw Error(a(160))}switch(r.tag){case 5:var l=r.stateNode;r.flags&32&&(he(l,""),r.flags&=-33);var u=Do(e);Oo(e,u,l);break;case 3:case 4:var i=r.stateNode.containerInfo,o=Do(e);Ro(e,o,i);break;default:throw Error(a(161))}}catch(s){Zs(e,e.return,s)}e.flags&=-3}n&4096&&(e.flags&=-4097)}function jo(e,n,t){Eo=e;$o(e,n,t)}function $o(e,n,t){for(var r=0!==(e.mode&1);null!==Eo;){var l=Eo,a=l.child;if(22===l.tag&&r){var u=null!==l.memoizedState||wo;if(!u){var i=l.alternate,o=null!==i&&null!==i.memoizedState||So;i=wo;var s=So;wo=u;if((So=o)&&!s)for(Eo=l;null!==Eo;)u=Eo,o=u.child,22===u.tag&&null!==u.memoizedState?Yo(l):null!==o?(o.return=u,Eo=o):Yo(l);for(;null!==a;)Eo=a,$o(a,n,t),a=a.sibling;Eo=l;wo=i;So=s}Ko(e,n,t)}else 0!==(l.subtreeFlags&8772)&&null!==a?(a.return=l,Eo=a):Ko(e,n,t)}}function Ko(e){for(;null!==Eo;){var n=Eo;if(0!==(n.flags&8772)){var t=n.alternate;try{if(0!==(n.flags&8772))switch(n.tag){case 0:case 11:case 15:So||To(5,n);break;case 1:var r=n.stateNode;if(n.flags&4&&!So)if(null===t)r.componentDidMount();else{var l=n.elementType===n.type?t.memoizedProps:Va(n.type,t.memoizedProps);r.componentDidUpdate(l,t.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var u=n.updateQueue;null!==u&&iu(n,u,r);break;case 3:var i=n.updateQueue;if(null!==i){t=null;if(null!==n.child)switch(n.child.tag){case 5:t=n.child.stateNode;break;case 1:t=n.child.stateNode}iu(n,i,t)}break;case 5:var o=n.stateNode;if(null===t&&n.flags&4){t=o;var s=n.memoizedProps;switch(n.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&t.focus();break;case"img":s.src&&(t.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(null===n.memoizedState){var c=n.alternate;if(null!==c){var f=c.memoizedState;if(null!==f){var d=f.dehydrated;null!==d&&Jn(d)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(a(163))}So||n.flags&512&&Lo(n)}catch(p){Zs(n,n.return,p)}}if(n===e){Eo=null;break}t=n.sibling;if(null!==t){t.return=n.return;Eo=t;break}Eo=n.return}}function qo(e){for(;null!==Eo;){var n=Eo;if(n===e){Eo=null;break}var t=n.sibling;if(null!==t){t.return=n.return;Eo=t;break}Eo=n.return}}function Yo(e){for(;null!==Eo;){var n=Eo;try{switch(n.tag){case 0:case 11:case 15:var t=n.return;try{To(4,n)}catch(o){Zs(n,t,o)}break;case 1:var r=n.stateNode;if("function"===typeof r.componentDidMount){var l=n.return;try{r.componentDidMount()}catch(o){Zs(n,l,o)}}var a=n.return;try{Lo(n)}catch(o){Zs(n,a,o)}break;case 5:var u=n.return;try{Lo(n)}catch(o){Zs(n,u,o)}}}catch(o){Zs(n,n.return,o)}if(n===e){Eo=null;break}var i=n.sibling;if(null!==i){i.return=n.return;Eo=i;break}Eo=n.return}}var Xo=Math.ceil,Go=x.ReactCurrentDispatcher,Zo=x.ReactCurrentOwner,Jo=x.ReactCurrentBatchConfig,es=0,ns=null,ts=null,rs=0,ls=0,as=$l(0),us=0,is=null,os=0,ss=0,cs=0,fs=null,ds=null,ps=0,ms=Infinity,hs=null,gs=!1,vs=null,ys=null,bs=!1,ks=null,ws=0,Ss=0,xs=null,Es=-1,Cs=0;function _s(){return 0!==(es&6)?tn():-1!==Es?Es:Es=tn()}function Ns(e){if(0===(e.mode&1))return 1;if(0!==(es&2)&&0!==rs)return rs&-rs;if(null!==Ua.transition)return 0===Cs&&(Cs=En()),Cs;e=Pn;if(0!==e)return e;e=window.event;e=void 0===e?16:it(e.type);return e}function zs(e,n,t,r){if(50<Ss)throw Ss=0,xs=null,Error(a(185));_n(e,t,r);if(0===(es&2)||e!==ns)e===ns&&(0===(es&2)&&(ss|=t),4===us&&Ds(e,rs)),Ps(e,r),1===t&&0===es&&0===(n.mode&1)&&(ms=tn()+500,ia&&fa())}function Ps(e,n){var t=e.callbackNode;Sn(e,n);var r=kn(e,e===ns?rs:0);if(0===r)null!==t&&Je(t),e.callbackNode=null,e.callbackPriority=0;else if(n=r&-r,e.callbackPriority!==n){null!=t&&Je(t);if(1===n)0===e.tag?ca(Rs.bind(null,e)):sa(Rs.bind(null,e)),zl((function(){0===(es&6)&&fa()})),t=null;else{switch(Tn(r)){case 1:t=ln;break;case 4:t=an;break;case 16:t=un;break;case 536870912:t=sn;break;default:t=un}t=lc(t,Ts.bind(null,e))}e.callbackPriority=n;e.callbackNode=t}}function Ts(e,n){Es=-1;Cs=0;if(0!==(es&6))throw Error(a(327));var t=e.callbackNode;if(Xs()&&e.callbackNode!==t)return null;var r=kn(e,e===ns?rs:0);if(0===r)return null;if(0!==(r&30)||0!==(r&e.expiredLanes)||n)n=Ws(e,r);else{n=r;var l=es;es|=2;var u=Bs();if(ns!==e||rs!==n)hs=null,ms=tn()+500,Vs(e,n);do{try{js();break}catch(o){As(e,o)}}while(1);Qa();Go.current=u;es=l;null!==ts?n=0:(ns=null,rs=0,n=us)}if(0!==n){2===n&&(l=xn(e),0!==l&&(r=l,n=Ls(e,l)));if(1===n)throw t=is,Vs(e,0),Ds(e,r),Ps(e,tn()),t;if(6===n)Ds(e,r);else{l=e.current.alternate;if(0===(r&30)&&!Fs(l)&&(n=Ws(e,r),2===n&&(u=xn(e),0!==u&&(r=u,n=Ls(e,u))),1===n))throw t=is,Vs(e,0),Ds(e,r),Ps(e,tn()),t;e.finishedWork=l;e.finishedLanes=r;switch(n){case 0:case 1:throw Error(a(345));case 2:qs(e,ds,hs);break;case 3:Ds(e,r);if((r&130023424)===r&&(n=ps+500-tn(),10<n)){if(0!==kn(e,0))break;l=e.suspendedLanes;if((l&r)!==r){_s();e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=Cl(qs.bind(null,e,ds,hs),n);break}qs(e,ds,hs);break;case 4:Ds(e,r);if((r&4194240)===r)break;n=e.eventTimes;for(l=-1;0<r;){var i=31-pn(r);u=1<<i;i=n[i];i>l&&(l=i);r&=~u}r=l;r=tn()-r;r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Xo(r/1960))-r;if(10<r){e.timeoutHandle=Cl(qs.bind(null,e,ds,hs),r);break}qs(e,ds,hs);break;case 5:qs(e,ds,hs);break;default:throw Error(a(329))}}}Ps(e,tn());return e.callbackNode===t?Ts.bind(null,e):null}function Ls(e,n){var t=fs;e.current.memoizedState.isDehydrated&&(Vs(e,n).flags|=256);e=Ws(e,n);2!==e&&(n=ds,ds=t,null!==n&&Ms(n));return e}function Ms(e){null===ds?ds=e:ds.push.apply(ds,e)}function Fs(e){for(var n=e;;){if(n.flags&16384){var t=n.updateQueue;if(null!==t&&(t=t.stores,null!==t))for(var r=0;r<t.length;r++){var l=t[r],a=l.getSnapshot;l=l.value;try{if(!Nr(a(),l))return!1}catch(u){return!1}}}t=n.child;if(n.subtreeFlags&16384&&null!==t)t.return=n,n=t;else{if(n===e)break;for(;null===n.sibling;){if(null===n.return||n.return===e)return!0;n=n.return}n.sibling.return=n.return;n=n.sibling}}return!0}function Ds(e,n){n&=~cs;n&=~ss;e.suspendedLanes|=n;e.pingedLanes&=~n;for(e=e.expirationTimes;0<n;){var t=31-pn(n),r=1<<t;e[t]=-1;n&=~r}}function Rs(e){if(0!==(es&6))throw Error(a(327));Xs();var n=kn(e,0);if(0===(n&1))return Ps(e,tn()),null;var t=Ws(e,n);if(0!==e.tag&&2===t){var r=xn(e);0!==r&&(n=r,t=Ls(e,r))}if(1===t)throw t=is,Vs(e,0),Ds(e,n),Ps(e,tn()),t;if(6===t)throw Error(a(345));e.finishedWork=e.current.alternate;e.finishedLanes=n;qs(e,ds,hs);Ps(e,tn());return null}function Os(e,n){var t=es;es|=1;try{return e(n)}finally{es=t,0===es&&(ms=tn()+500,ia&&fa())}}function Is(e){null!==ks&&0===ks.tag&&0===(es&6)&&Xs();var n=es;es|=1;var t=Jo.transition,r=Pn;try{if(Jo.transition=null,Pn=1,e)return e()}finally{Pn=r,Jo.transition=t,es=n,0===(es&6)&&fa()}}function Us(){ls=as.current;Kl(as)}function Vs(e,n){e.finishedWork=null;e.finishedLanes=0;var t=e.timeoutHandle;-1!==t&&(e.timeoutHandle=-1,_l(t));if(null!==ts)for(t=ts.return;null!==t;){var r=t;Ea(r);switch(r.tag){case 1:r=r.type.childContextTypes;null!==r&&void 0!==r&&na();break;case 3:Nu();Kl(Gl);Kl(Xl);Fu();break;case 5:Pu(r);break;case 4:Nu();break;case 13:Kl(Tu);break;case 19:Kl(Tu);break;case 10:ja(r.type._context);break;case 22:case 23:Us()}t=t.return}ns=e;ts=e=sc(e.current,null);rs=ls=n;us=0;is=null;cs=ss=os=0;ds=fs=null;if(null!==Ya){for(n=0;n<Ya.length;n++)if(t=Ya[n],r=t.interleaved,null!==r){t.interleaved=null;var l=r.next,a=t.pending;if(null!==a){var u=a.next;a.next=l;r.next=u}t.pending=r}Ya=null}return e}function As(e,n){do{var t=ts;try{Qa();Du.current=zi;if(Au){for(var r=Iu.memoizedState;null!==r;){var l=r.queue;null!==l&&(l.pending=null);r=r.next}Au=!1}Ou=0;Vu=Uu=Iu=null;Bu=!1;Hu=0;Zo.current=null;if(null===t||null===t.return){us=1;is=n;ts=null;break}e:{var u=e,i=t.return,o=t,s=n;n=rs;o.flags|=32768;if(null!==s&&"object"===typeof s&&"function"===typeof s.then){var c=s,f=o,d=f.tag;if(0===(f.mode&1)&&(0===d||11===d||15===d)){var p=f.alternate;p?(f.updateQueue=p.updateQueue,f.memoizedState=p.memoizedState,f.lanes=p.lanes):(f.updateQueue=null,f.memoizedState=null)}var m=Vi(i);if(null!==m){m.flags&=-257;Ai(m,i,o,u,n);m.mode&1&&Ui(u,c,n);n=m;s=c;var h=n.updateQueue;if(null===h){var g=new Set;g.add(s);n.updateQueue=g}else h.add(s);break e}else{if(0===(n&1)){Ui(u,c,n);Hs();break e}s=Error(a(426))}}else if(Na&&o.mode&1){var v=Vi(i);if(null!==v){0===(v.flags&65536)&&(v.flags|=256);Ai(v,i,o,u,n);Ia(Mi(s,o));break e}}u=s=Mi(s,o);4!==us&&(us=2);null===fs?fs=[u]:fs.push(u);u=i;do{switch(u.tag){case 3:u.flags|=65536;n&=-n;u.lanes|=n;var y=Oi(u,s,n);au(u,y);break e;case 1:o=s;var b=u.type,k=u.stateNode;if(0===(u.flags&128)&&("function"===typeof b.getDerivedStateFromError||null!==k&&"function"===typeof k.componentDidCatch&&(null===ys||!ys.has(k)))){u.flags|=65536;n&=-n;u.lanes|=n;var w=Ii(u,o,n);au(u,w);break e}}u=u.return}while(null!==u)}Ks(t)}catch(S){n=S;ts===t&&null!==t&&(ts=t=t.return);continue}break}while(1)}function Bs(){var e=Go.current;Go.current=zi;return null===e?zi:e}function Hs(){if(0===us||3===us||2===us)us=4;null===ns||0===(os&268435455)&&0===(ss&268435455)||Ds(ns,rs)}function Ws(e,n){var t=es;es|=2;var r=Bs();if(ns!==e||rs!==n)hs=null,Vs(e,n);do{try{Qs();break}catch(l){As(e,l)}}while(1);Qa();es=t;Go.current=r;if(null!==ts)throw Error(a(261));ns=null;rs=0;return us}function Qs(){for(;null!==ts;)$s(ts)}function js(){for(;null!==ts&&!en();)$s(ts)}function $s(e){var n=rc(e.alternate,e,ls);e.memoizedProps=e.pendingProps;null===n?Ks(e):ts=n;Zo.current=null}function Ks(e){var n=e;do{var t=n.alternate;e=n.return;if(0===(n.flags&32768)){if(t=bo(t,n,ls),null!==t){ts=t;return}}else{t=ko(t,n);if(null!==t){t.flags&=32767;ts=t;return}if(null!==e)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{us=6;ts=null;return}}n=n.sibling;if(null!==n){ts=n;return}ts=n=e}while(null!==n);0===us&&(us=5)}function qs(e,n,t){var r=Pn,l=Jo.transition;try{Jo.transition=null,Pn=1,Ys(e,n,t,r)}finally{Jo.transition=l,Pn=r}return null}function Ys(e,n,t,r){do{Xs()}while(null!==ks);if(0!==(es&6))throw Error(a(327));t=e.finishedWork;var l=e.finishedLanes;if(null===t)return null;e.finishedWork=null;e.finishedLanes=0;if(t===e.current)throw Error(a(177));e.callbackNode=null;e.callbackPriority=0;var u=t.lanes|t.childLanes;Nn(e,u);e===ns&&(ts=ns=null,rs=0);0===(t.subtreeFlags&2064)&&0===(t.flags&2064)||bs||(bs=!0,lc(un,(function(){Xs();return null})));u=0!==(t.flags&15990);if(0!==(t.subtreeFlags&15990)||u){u=Jo.transition;Jo.transition=null;var i=Pn;Pn=1;var o=es;es|=4;Zo.current=null;zo(e,t);Wo(t,e);Dr(xl);nt=!!Sl;xl=Sl=null;e.current=t;jo(t,e,l);nn();es=o;Pn=i;Jo.transition=u}else e.current=t;bs&&(bs=!1,ks=e,ws=l);u=e.pendingLanes;0===u&&(ys=null);dn(t.stateNode,r);Ps(e,tn());if(null!==n)for(r=e.onRecoverableError,t=0;t<n.length;t++)l=n[t],r(l.value,{componentStack:l.stack,digest:l.digest});if(gs)throw gs=!1,e=vs,vs=null,e;0!==(ws&1)&&0!==e.tag&&Xs();u=e.pendingLanes;0!==(u&1)?e===xs?Ss++:(Ss=0,xs=e):Ss=0;fa();return null}function Xs(){if(null!==ks){var e=Tn(ws),n=Jo.transition,t=Pn;try{Jo.transition=null;Pn=16>e?16:e;if(null===ks)var r=!1;else{e=ks;ks=null;ws=0;if(0!==(es&6))throw Error(a(331));var l=es;es|=4;for(Eo=e.current;null!==Eo;){var u=Eo,i=u.child;if(0!==(Eo.flags&16)){var o=u.deletions;if(null!==o){for(var s=0;s<o.length;s++){var c=o[s];for(Eo=c;null!==Eo;){var f=Eo;switch(f.tag){case 0:case 11:case 15:Po(8,f,u)}var d=f.child;if(null!==d)d.return=f,Eo=d;else for(;null!==Eo;){f=Eo;var p=f.sibling,m=f.return;Mo(f);if(f===c){Eo=null;break}if(null!==p){p.return=m;Eo=p;break}Eo=m}}}var h=u.alternate;if(null!==h){var g=h.child;if(null!==g){h.child=null;do{var v=g.sibling;g.sibling=null;g=v}while(null!==g)}}Eo=u}}if(0!==(u.subtreeFlags&2064)&&null!==i)i.return=u,Eo=i;else e:for(;null!==Eo;){u=Eo;if(0!==(u.flags&2048))switch(u.tag){case 0:case 11:case 15:Po(9,u,u.return)}var y=u.sibling;if(null!==y){y.return=u.return;Eo=y;break e}Eo=u.return}}var b=e.current;for(Eo=b;null!==Eo;){i=Eo;var k=i.child;if(0!==(i.subtreeFlags&2064)&&null!==k)k.return=i,Eo=k;else e:for(i=b;null!==Eo;){o=Eo;if(0!==(o.flags&2048))try{switch(o.tag){case 0:case 11:case 15:To(9,o)}}catch(S){Zs(o,o.return,S)}if(o===i){Eo=null;break e}var w=o.sibling;if(null!==w){w.return=o.return;Eo=w;break e}Eo=o.return}}es=l;fa();if(fn&&"function"===typeof fn.onPostCommitFiberRoot)try{fn.onPostCommitFiberRoot(cn,e)}catch(S){}r=!0}return r}finally{Pn=t,Jo.transition=n}}return!1}function Gs(e,n,t){n=Mi(t,n);n=Oi(e,n,1);e=ru(e,n,1);n=_s();null!==e&&(_n(e,1,n),Ps(e,n))}function Zs(e,n,t){if(3===e.tag)Gs(e,e,t);else for(;null!==n;){if(3===n.tag){Gs(n,e,t);break}else if(1===n.tag){var r=n.stateNode;if("function"===typeof n.type.getDerivedStateFromError||"function"===typeof r.componentDidCatch&&(null===ys||!ys.has(r))){e=Mi(t,e);e=Ii(n,e,1);n=ru(n,e,1);e=_s();null!==n&&(_n(n,1,e),Ps(n,e));break}}n=n.return}}function Js(e,n,t){var r=e.pingCache;null!==r&&r.delete(n);n=_s();e.pingedLanes|=e.suspendedLanes&t;ns===e&&(rs&t)===t&&(4===us||3===us&&(rs&130023424)===rs&&500>tn()-ps?Vs(e,0):cs|=t);Ps(e,n)}function ec(e,n){0===n&&(0===(e.mode&1)?n=1:(n=yn,yn<<=1,0===(yn&130023424)&&(yn=4194304)));var t=_s();e=Za(e,n);null!==e&&(_n(e,n,t),Ps(e,t))}function nc(e){var n=e.memoizedState,t=0;null!==n&&(t=n.retryLane);ec(e,t)}function tc(e,n){var t=0;switch(e.tag){case 13:var r=e.stateNode;var l=e.memoizedState;null!==l&&(t=l.retryLane);break;case 19:r=e.stateNode;break;default:throw Error(a(314))}null!==r&&r.delete(n);ec(e,t)}var rc;rc=function(e,n,t){if(null!==e)if(e.memoizedProps!==n.pendingProps||Gl.current)Hi=!0;else{if(0===(e.lanes&t)&&0===(n.flags&128))return Hi=!1,fo(e,n,t);Hi=0!==(e.flags&131072)?!0:!1}else Hi=!1,Na&&0!==(n.flags&1048576)&&Sa(n,ha,n.index);n.lanes=0;switch(n.tag){case 2:var r=n.type;so(e,n);e=n.pendingProps;var l=Jl(n,Xl.current);Ka(n,t);l=$u(null,n,r,e,l,t);var u=Ku();n.flags|=1;"object"===typeof l&&null!==l&&"function"===typeof l.render&&void 0===l.$$typeof?(n.tag=1,n.memoizedState=null,n.updateQueue=null,ea(r)?(u=!0,la(n)):u=!1,n.memoizedState=null!==l.state&&void 0!==l.state?l.state:null,eu(n),l.updater=cu,n.stateNode=l,l._reactInternals=n,mu(n,r,e,t),n=Gi(null,n,r,!0,u,t)):(n.tag=0,Na&&u&&xa(n),Wi(null,n,l,t),n=n.child);return n;case 16:r=n.elementType;e:{so(e,n);e=n.pendingProps;l=r._init;r=l(r._payload);n.type=r;l=n.tag=oc(r);e=Va(r,e);switch(l){case 0:n=Yi(null,n,r,e,t);break e;case 1:n=Xi(null,n,r,e,t);break e;case 11:n=Qi(null,n,r,e,t);break e;case 14:n=ji(null,n,r,Va(r.type,e),t);break e}throw Error(a(306,r,""))}return n;case 0:return r=n.type,l=n.pendingProps,l=n.elementType===r?l:Va(r,l),Yi(e,n,r,l,t);case 1:return r=n.type,l=n.pendingProps,l=n.elementType===r?l:Va(r,l),Xi(e,n,r,l,t);case 3:e:{Zi(n);if(null===e)throw Error(a(387));r=n.pendingProps;u=n.memoizedState;l=u.element;nu(e,n);uu(n,r,null,t);var i=n.memoizedState;r=i.element;if(u.isDehydrated)if(u={element:r,isDehydrated:!1,cache:i.cache,pendingSuspenseBoundaries:i.pendingSuspenseBoundaries,transitions:i.transitions},n.updateQueue.baseState=u,n.memoizedState=u,n.flags&256){l=Mi(Error(a(423)),n);n=Ji(e,n,r,t,l);break e}else if(r!==l){l=Mi(Error(a(424)),n);n=Ji(e,n,r,t,l);break e}else for(_a=Ll(n.stateNode.containerInfo.firstChild),Ca=n,Na=!0,za=null,t=ku(n,null,r,t),n.child=t;t;)t.flags=t.flags&-3|4096,t=t.sibling;else{Oa();if(r===l){n=co(e,n,t);break e}Wi(e,n,r,t)}n=n.child}return n;case 5:return zu(n),null===e&&Ma(n),r=n.type,l=n.pendingProps,u=null!==e?e.memoizedProps:null,i=l.children,El(r,l)?i=null:null!==u&&El(r,u)&&(n.flags|=32),qi(e,n),Wi(e,n,i,t),n.child;case 6:return null===e&&Ma(n),null;case 13:return to(e,n,t);case 4:return _u(n,n.stateNode.containerInfo),r=n.pendingProps,null===e?n.child=bu(n,null,r,t):Wi(e,n,r,t),n.child;case 11:return r=n.type,l=n.pendingProps,l=n.elementType===r?l:Va(r,l),Qi(e,n,r,l,t);case 7:return Wi(e,n,n.pendingProps,t),n.child;case 8:return Wi(e,n,n.pendingProps.children,t),n.child;case 12:return Wi(e,n,n.pendingProps.children,t),n.child;case 10:e:{r=n.type._context;l=n.pendingProps;u=n.memoizedProps;i=l.value;ql(Aa,r._currentValue);r._currentValue=i;if(null!==u)if(Nr(u.value,i)){if(u.children===l.children&&!Gl.current){n=co(e,n,t);break e}}else for(u=n.child,null!==u&&(u.return=n);null!==u;){var o=u.dependencies;if(null!==o){i=u.child;for(var s=o.firstContext;null!==s;){if(s.context===r){if(1===u.tag){s=tu(-1,t&-t);s.tag=2;var c=u.updateQueue;if(null!==c){c=c.shared;var f=c.pending;null===f?s.next=s:(s.next=f.next,f.next=s);c.pending=s}}u.lanes|=t;s=u.alternate;null!==s&&(s.lanes|=t);$a(u.return,t,n);o.lanes|=t;break}s=s.next}}else if(10===u.tag)i=u.type===n.type?null:u.child;else if(18===u.tag){i=u.return;if(null===i)throw Error(a(341));i.lanes|=t;o=i.alternate;null!==o&&(o.lanes|=t);$a(i,t,n);i=u.sibling}else i=u.child;if(null!==i)i.return=u;else for(i=u;null!==i;){if(i===n){i=null;break}u=i.sibling;if(null!==u){u.return=i.return;i=u;break}i=i.return}u=i}Wi(e,n,l.children,t);n=n.child}return n;case 9:return l=n.type,r=n.pendingProps.children,Ka(n,t),l=qa(l),r=r(l),n.flags|=1,Wi(e,n,r,t),n.child;case 14:return r=n.type,l=Va(r,n.pendingProps),l=Va(r.type,l),ji(e,n,r,l,t);case 15:return $i(e,n,n.type,n.pendingProps,t);case 17:return r=n.type,l=n.pendingProps,l=n.elementType===r?l:Va(r,l),so(e,n),n.tag=1,ea(r)?(e=!0,la(n)):e=!1,Ka(n,t),du(n,r,l),mu(n,r,l,t),Gi(null,n,r,!0,e,t);case 19:return oo(e,n,t);case 22:return Ki(e,n,t)}throw Error(a(156,n.tag))};function lc(e,n){return Ze(e,n)}function ac(e,n,t,r){this.tag=e;this.key=t;this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null;this.index=0;this.ref=null;this.pendingProps=n;this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null;this.mode=r;this.subtreeFlags=this.flags=0;this.deletions=null;this.childLanes=this.lanes=0;this.alternate=null}function uc(e,n,t,r){return new ac(e,n,t,r)}function ic(e){e=e.prototype;return!(!e||!e.isReactComponent)}function oc(e){if("function"===typeof e)return ic(e)?1:0;if(void 0!==e&&null!==e){e=e.$$typeof;if(e===L)return 11;if(e===D)return 14}return 2}function sc(e,n){var t=e.alternate;null===t?(t=uc(e.tag,n,e.key,e.mode),t.elementType=e.elementType,t.type=e.type,t.stateNode=e.stateNode,t.alternate=e,e.alternate=t):(t.pendingProps=n,t.type=e.type,t.flags=0,t.subtreeFlags=0,t.deletions=null);t.flags=e.flags&14680064;t.childLanes=e.childLanes;t.lanes=e.lanes;t.child=e.child;t.memoizedProps=e.memoizedProps;t.memoizedState=e.memoizedState;t.updateQueue=e.updateQueue;n=e.dependencies;t.dependencies=null===n?null:{lanes:n.lanes,firstContext:n.firstContext};t.sibling=e.sibling;t.index=e.index;t.ref=e.ref;return t}function cc(e,n,t,r,l,u){var i=2;r=e;if("function"===typeof e)ic(e)&&(i=1);else if("string"===typeof e)i=5;else e:switch(e){case _:return fc(t.children,l,u,n);case N:i=8;l|=8;break;case z:return e=uc(12,t,n,l|2),e.elementType=z,e.lanes=u,e;case M:return e=uc(13,t,n,l),e.elementType=M,e.lanes=u,e;case F:return e=uc(19,t,n,l),e.elementType=F,e.lanes=u,e;case O:return dc(t,l,u,n);default:if("object"===typeof e&&null!==e)switch(e.$$typeof){case P:i=10;break e;case T:i=9;break e;case L:i=11;break e;case D:i=14;break e;case R:i=16;r=null;break e}throw Error(a(130,null==e?e:typeof e,""))}n=uc(i,t,n,l);n.elementType=e;n.type=r;n.lanes=u;return n}function fc(e,n,t,r){e=uc(7,e,r,n);e.lanes=t;return e}function dc(e,n,t,r){e=uc(22,e,r,n);e.elementType=O;e.lanes=t;e.stateNode={isHidden:!1};return e}function pc(e,n,t){e=uc(6,e,null,n);e.lanes=t;return e}function mc(e,n,t){n=uc(4,null!==e.children?e.children:[],e.key,n);n.lanes=t;n.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation};return n}function hc(e,n,t,r,l){this.tag=n;this.containerInfo=e;this.finishedWork=this.pingCache=this.current=this.pendingChildren=null;this.timeoutHandle=-1;this.callbackNode=this.pendingContext=this.context=null;this.callbackPriority=0;this.eventTimes=Cn(0);this.expirationTimes=Cn(-1);this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0;this.entanglements=Cn(0);this.identifierPrefix=r;this.onRecoverableError=l;this.mutableSourceEagerHydrationData=null}function gc(e,n,t,r,l,a,u,i,o){e=new hc(e,n,t,i,o);1===n?(n=1,!0===a&&(n|=8)):n=0;a=uc(3,null,null,n);e.current=a;a.stateNode=e;a.memoizedState={element:r,isDehydrated:t,cache:null,transitions:null,pendingSuspenseBoundaries:null};eu(a);return e}function vc(e,n,t){var r=3<arguments.length&&void 0!==arguments[3]?arguments[3]:null;return{$$typeof:C,key:null==r?null:""+r,children:e,containerInfo:n,implementation:t}}function yc(e){if(!e)return Yl;e=e._reactInternals;e:{if($e(e)!==e||1!==e.tag)throw Error(a(170));var n=e;do{switch(n.tag){case 3:n=n.stateNode.context;break e;case 1:if(ea(n.type)){n=n.stateNode.__reactInternalMemoizedMergedChildContext;break e}}n=n.return}while(null!==n);throw Error(a(171))}if(1===e.tag){var t=e.type;if(ea(t))return ra(e,t,n)}return n}function bc(e,n,t,r,l,a,u,i,o){e=gc(t,r,!0,e,l,a,u,i,o);e.context=yc(null);t=e.current;r=_s();l=Ns(t);a=tu(r,l);a.callback=void 0!==n&&null!==n?n:null;ru(t,a,l);e.current.lanes=l;_n(e,l,r);Ps(e,r);return e}function kc(e,n,t,r){var l=n.current,a=_s(),u=Ns(l);t=yc(t);null===n.context?n.context=t:n.pendingContext=t;n=tu(a,u);n.payload={element:e};r=void 0===r?null:r;null!==r&&(n.callback=r);e=ru(l,n,u);null!==e&&(zs(e,l,u,a),lu(e,l,u));return u}function wc(e){e=e.current;if(!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Sc(e,n){e=e.memoizedState;if(null!==e&&null!==e.dehydrated){var t=e.retryLane;e.retryLane=0!==t&&t<n?t:n}}function xc(e,n){Sc(e,n);(e=e.alternate)&&Sc(e,n)}function Ec(){return null}var Cc="function"===typeof reportError?reportError:function(e){console.error(e)};function _c(e){this._internalRoot=e}Nc.prototype.render=_c.prototype.render=function(e){var n=this._internalRoot;if(null===n)throw Error(a(409));kc(e,n,null,null)};Nc.prototype.unmount=_c.prototype.unmount=function(){var e=this._internalRoot;if(null!==e){this._internalRoot=null;var n=e.containerInfo;Is((function(){kc(null,e,null,null)}));n[Ol]=null}};function Nc(e){this._internalRoot=e}Nc.prototype.unstable_scheduleHydration=function(e){if(e){var n=Dn();e={blockedOn:null,target:e,priority:n};for(var t=0;t<Wn.length&&0!==n&&n<Wn[t].priority;t++);Wn.splice(t,0,e);0===t&&qn(e)}};function zc(e){return!(!e||1!==e.nodeType&&9!==e.nodeType&&11!==e.nodeType)}function Pc(e){return!(!e||1!==e.nodeType&&9!==e.nodeType&&11!==e.nodeType&&(8!==e.nodeType||" react-mount-point-unstable "!==e.nodeValue))}function Tc(){}function Lc(e,n,t,r,l){if(l){if("function"===typeof r){var a=r;r=function(){var e=wc(u);a.call(e)}}var u=bc(n,r,e,0,null,!1,!1,"",Tc);e._reactRootContainer=u;e[Ol]=u.current;cl(8===e.nodeType?e.parentNode:e);Is();return u}for(;l=e.lastChild;)e.removeChild(l);if("function"===typeof r){var i=r;r=function(){var e=wc(o);i.call(e)}}var o=gc(e,0,!1,null,null,!1,!1,"",Tc);e._reactRootContainer=o;e[Ol]=o.current;cl(8===e.nodeType?e.parentNode:e);Is((function(){kc(n,o,t,r)}));return o}function Mc(e,n,t,r,l){var a=t._reactRootContainer;if(a){var u=a;if("function"===typeof l){var i=l;l=function(){var e=wc(u);i.call(e)}}kc(n,u,e,l)}else u=Lc(t,n,e,l,r);return wc(u)}Ln=function(e){switch(e.tag){case 3:var n=e.stateNode;if(n.current.memoizedState.isDehydrated){var t=bn(n.pendingLanes);0!==t&&(zn(n,t|1),Ps(n,tn()),0===(es&6)&&(ms=tn()+500,fa()))}break;case 13:Is((function(){var n=Za(e,1);if(null!==n){var t=_s();zs(n,e,1,t)}})),xc(e,1)}};Mn=function(e){if(13===e.tag){var n=Za(e,134217728);if(null!==n){var t=_s();zs(n,e,134217728,t)}xc(e,134217728)}};Fn=function(e){if(13===e.tag){var n=Ns(e),t=Za(e,n);if(null!==t){var r=_s();zs(t,e,n,r)}xc(e,n)}};Dn=function(){return Pn};Rn=function(e,n){var t=Pn;try{return Pn=e,n()}finally{Pn=t}};Ce=function(e,n,t){switch(n){case"input":te(e,t);n=t.name;if("radio"===t.type&&null!=n){for(t=e;t.parentNode;)t=t.parentNode;t=t.querySelectorAll("input[name="+JSON.stringify(""+n)+'][type="radio"]');for(n=0;n<t.length;n++){var r=t[n];if(r!==e&&r.form===e.form){var l=Wl(r);if(!l)throw Error(a(90));G(r);te(r,l)}}}break;case"textarea":se(e,t);break;case"select":n=t.value,null!=n&&ue(e,!!t.multiple,n,!1)}};Le=Os;Me=Is;var Fc={usingClientEntryPoint:!1,Events:[Bl,Hl,Wl,Pe,Te,Os]},Dc={findFiberByHostInstance:Al,bundleType:0,version:"18.2.0",rendererPackageName:"react-dom"};var Rc={bundleType:Dc.bundleType,version:Dc.version,rendererPackageName:Dc.rendererPackageName,rendererConfig:Dc.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:x.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){e=Xe(e);return null===e?null:e.stateNode},findFiberByHostInstance:Dc.findFiberByHostInstance||Ec,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.2.0-next-9e3b772b8-20220608"};if("undefined"!==typeof __REACT_DEVTOOLS_GLOBAL_HOOK__){var Oc=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Oc.isDisabled&&Oc.supportsFiber)try{cn=Oc.inject(Rc),fn=Oc}catch(Ic){}}n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Fc;n.createPortal=function(e,n){var t=2<arguments.length&&void 0!==arguments[2]?arguments[2]:null;if(!zc(n))throw Error(a(200));return vc(e,n,null,t)};n.createRoot=function(e,n){if(!zc(e))throw Error(a(299));var t=!1,r="",l=Cc;null!==n&&void 0!==n&&(!0===n.unstable_strictMode&&(t=!0),void 0!==n.identifierPrefix&&(r=n.identifierPrefix),void 0!==n.onRecoverableError&&(l=n.onRecoverableError));n=gc(e,1,!1,null,null,t,!1,r,l);e[Ol]=n.current;cl(8===e.nodeType?e.parentNode:e);return new _c(n)};n.findDOMNode=function(e){if(null==e)return null;if(1===e.nodeType)return e;var n=e._reactInternals;if(void 0===n){if("function"===typeof e.render)throw Error(a(188));e=Object.keys(e).join(",");throw Error(a(268,e))}e=Xe(n);e=null===e?null:e.stateNode;return e};n.flushSync=function(e){return Is(e)};n.hydrate=function(e,n,t){if(!Pc(n))throw Error(a(200));return Mc(null,e,n,!0,t)};n.hydrateRoot=function(e,n,t){if(!zc(e))throw Error(a(405));var r=null!=t&&t.hydratedSources||null,l=!1,u="",i=Cc;null!==t&&void 0!==t&&(!0===t.unstable_strictMode&&(l=!0),void 0!==t.identifierPrefix&&(u=t.identifierPrefix),void 0!==t.onRecoverableError&&(i=t.onRecoverableError));n=bc(n,null,e,1,null!=t?t:null,l,!1,u,i);e[Ol]=n.current;cl(e);if(r)for(e=0;e<r.length;e++)t=r[e],l=t._getVersion,l=l(t._source),null==n.mutableSourceEagerHydrationData?n.mutableSourceEagerHydrationData=[t,l]:n.mutableSourceEagerHydrationData.push(t,l);return new Nc(n)};n.render=function(e,n,t){if(!Pc(n))throw Error(a(200));return Mc(null,e,n,!1,t)};n.unmountComponentAtNode=function(e){if(!Pc(e))throw Error(a(40));return e._reactRootContainer?(Is((function(){Mc(null,null,e,!1,(function(){e._reactRootContainer=null;e[Ol]=null}))})),!0):!1};n.unstable_batchedUpdates=Os;n.unstable_renderSubtreeIntoContainer=function(e,n,t,r){if(!Pc(t))throw Error(a(200));if(null==e||void 0===e._reactInternals)throw Error(a(38));return Mc(e,n,t,!1,r)};n.version="18.2.0-next-9e3b772b8-20220608"},"40961":(e,n,t)=>{function r(){if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__==="undefined"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!=="function"){return}if(false){}try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r)}catch(e){console.error(e)}}if(true){r();e.exports=t(22551)}else{}},"69982":(e,n,t)=>{if(true){e.exports=t(7463)}else{}},"96540":(e,t,r)=>{if(true){e.exports=r(15287)}else{}}};const __vc={};function __vr(k){if(k===44914)return __vr(96540);if(__vc[k])return __vc[k].exports;const m={exports:{}};__vc[k]=m;__vendor[k](m,m.exports,__vr);return m.exports;}
const __modules={"src/App.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = require("react");
const useWorkspace_1 = require("./state/useWorkspace");
const Icon_1 = require("./components/Icon");
const Ui_1 = require("./components/Ui");
const Infrastructure_1 = require("./features/Infrastructure");
const SupplyMatrix_1 = require("./features/SupplyMatrix");
const RiskPanel_1 = require("./features/RiskPanel");
const ResultPanel_1 = require("./features/ResultPanel");
const ResultDetails_1 = require("./features/ResultDetails");
const PlanEditor_1 = require("./features/PlanEditor");
const Compare_1 = require("./features/Compare");
const DataCatalog_1 = require("./features/DataCatalog");
const format_1 = require("./lib/format");
const catalog_1 = require("./lib/catalog");
const pair_1 = require("./lib/pair");
function App() {
    const w = (0, useWorkspace_1.useWorkspace)(), file = (0, react_1.useRef)(null), menu = (0, react_1.useRef)(null);
    const [modal, setModal] = (0, react_1.useState)(null), [pending, setPending] = (0, react_1.useState)(null), [source, setSource] = (0, react_1.useState)(null);
    const [copyName, setCopyName] = (0, react_1.useState)(''), [copyScenario, setCopyScenario] = (0, react_1.useState)('BASE');
    function guard(action) {
        if (w.dirty)
            setPending(() => action);
        else
            action();
    }
    function menuAction(action) {
        if (menu.current)
            menu.current.open = false;
        action();
    }
    function importFile() { guard(() => file.current?.click()); }
    function showCopy() { setCopyName((w.name + ' — копия').slice(0, 140)); setCopyScenario(w.draft?.scenario_id || 'BASE'); setModal('copy'); }
    function mode(value) {
        if (value === 'both') {
            w.setBoth(true);
            return;
        }
        w.setBoth(false);
        if (w.draft && w.draft.scenario_id !== value)
            w.setDraft({ ...w.draft, scenario_id: value });
    }
    (0, react_1.useEffect)(() => {
        const key = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!w.busy && !w.riskBusy)
                    void w.save();
            }
            if (e.key === 'Escape' && menu.current)
                menu.current.open = false;
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    });
    (0, react_1.useEffect)(() => {
        const outside = (e) => {
            if (menu.current && !menu.current.contains(e.target))
                menu.current.open = false;
        };
        document.addEventListener('click', outside);
        return () => document.removeEventListener('click', outside);
    }, []);
    const advanced = () => setModal('advanced');
    return __React.createElement("div", { className: "operator-app" },
        __React.createElement("a", { href: "#main", className: "skip-link" }, "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043F\u043B\u0430\u043D\u0443"),
        __React.createElement("header", { className: "operator-header" },
            __React.createElement("div", { className: "identity" },
                __React.createElement(Icon_1.Brand, null),
                __React.createElement("div", null,
                    __React.createElement("strong", null,
                        "\u041A\u043E\u043D\u0442\u0443\u0440",
                        __React.createElement("span", null, "2035")))),
            __React.createElement("div", { className: "plan-title" },
                __React.createElement("button", { type: "button", className: "icon-button", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u043F\u043B\u0430\u043D", onClick: () => setModal('projects'), disabled: !!w.busy || w.riskBusy },
                    __React.createElement(Icon_1.Icon, { name: "folder" })),
                __React.createElement("label", { className: "sr-only", htmlFor: "plan-name" }, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u043B\u0430\u043D\u0430"),
                __React.createElement("input", { id: "plan-name", name: "plan-name", title: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u043B\u0430\u043D\u0430 \u2014 \u043C\u043E\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C", value: w.name, maxLength: 140, disabled: !!w.busy, autoComplete: "off", onChange: e => w.setName(e.target.value) }),
                __React.createElement("span", { className: `save-dot ${w.dirty ? 'dirty' : ''}`, title: w.dirty ? 'Есть несохранённые изменения' : 'Нет несохранённых изменений' })),
            __React.createElement("div", { className: "scenario-switch", "aria-label": "\u0420\u0435\u0436\u0438\u043C \u0440\u0430\u0441\u0447\u0451\u0442\u0430" },
                __React.createElement("button", { type: "button", disabled: !!w.busy, "aria-pressed": !w.both && w.draft?.scenario_id === 'BASE', onClick: () => mode('BASE') }, "BASE"),
                __React.createElement("button", { type: "button", disabled: !!w.busy, "aria-pressed": !w.both && w.draft?.scenario_id === 'MANDATORY_STRESS', onClick: () => mode('MANDATORY_STRESS') }, "STRESS"),
                __React.createElement("button", { type: "button", disabled: !!w.busy, "aria-pressed": w.both, onClick: () => mode('both') },
                    __React.createElement(Icon_1.Icon, { name: "compare", size: 14 }),
                    __React.createElement("span", null, "\u041E\u0431\u0430"))),
            __React.createElement("div", { className: "header-actions" },
                __React.createElement(Ui_1.Button, { className: "risk-button", disabled: !!w.busy || !w.draft || w.loading, onClick: () => { setModal('risk'); if (!w.riskBusy)
                        void w.analyzeRisk(); } },
                    w.riskBusy ? __React.createElement(Ui_1.Spinner, null) : __React.createElement(Icon_1.Icon, { name: "chart", size: 14 }),
                    "\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0438\u0441\u043A\u043E\u0432"),
                __React.createElement(Ui_1.Button, { kind: "primary", className: "calculate-button", disabled: !!w.busy || w.riskBusy || !w.draft || w.loading, onClick: () => void w.save() },
                    w.busy ? __React.createElement(Ui_1.Spinner, null) : __React.createElement(Icon_1.Icon, { name: "save", size: 14 }),
                    __React.createElement("span", null, w.busy ? 'Выполняем…' : 'Сохранить')),
                __React.createElement("details", { ref: menu, className: "actions-menu" },
                    __React.createElement("summary", { "aria-label": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441 \u043F\u043B\u0430\u043D\u043E\u043C" },
                        __React.createElement(Icon_1.Icon, { name: "more" })),
                    __React.createElement("div", { className: "menu-panel" },
                        __React.createElement("button", { type: "button", disabled: !!w.busy || w.riskBusy, onClick: () => menuAction(() => guard(() => void w.newPlan())) },
                            __React.createElement(Icon_1.Icon, { name: "plus" }),
                            "\u041D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u043D"),
                        __React.createElement("button", { type: "button", disabled: !!w.busy || w.riskBusy || !w.draft, onClick: () => menuAction(() => void w.save()) },
                            __React.createElement(Icon_1.Icon, { name: "save" }),
                            "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
                            __React.createElement("span", { className: "key-hint" }, "Ctrl S")),
                        __React.createElement("button", { type: "button", disabled: !!w.busy || w.riskBusy || !w.draft, onClick: () => menuAction(showCopy) },
                            __React.createElement(Icon_1.Icon, { name: "copy" }),
                            "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u044E"),
                        __React.createElement("div", { className: "menu-divider" }),
                        __React.createElement("button", { type: "button", disabled: !!w.busy || w.riskBusy, onClick: () => menuAction(importFile) },
                            __React.createElement(Icon_1.Icon, { name: "upload" }),
                            "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C JSON"),
                        __React.createElement("button", { type: "button", disabled: !!w.busy || w.riskBusy || !w.draft, onClick: () => menuAction(() => setModal('export')) },
                            __React.createElement(Icon_1.Icon, { name: "download" }),
                            "\u0421\u043A\u0430\u0447\u0430\u0442\u044C\u2026"),
                        __React.createElement("button", { type: "button", onClick: () => menuAction(() => setModal('compare')) },
                            __React.createElement(Icon_1.Icon, { name: "compare" }),
                            "\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B"),
                        __React.createElement("button", { type: "button", onClick: () => menuAction(() => setModal('help')) },
                            __React.createElement(Icon_1.Icon, { name: "info" }),
                            "\u041E \u043C\u043E\u0434\u0435\u043B\u0438 \u0438 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0435"),
                        __React.createElement("div", { className: "menu-divider" }),
                        __React.createElement("button", { className: "danger-text", type: "button", disabled: !!w.busy || w.riskBusy || !w.project, onClick: () => menuAction(() => setModal('delete')) },
                            __React.createElement(Icon_1.Icon, { name: "trash" }),
                            "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043B\u0430\u043D"))))),
        w.errorMessage && __React.createElement("div", { className: "error-banner", role: "alert" },
            __React.createElement(Icon_1.Icon, { name: "alert" }),
            __React.createElement("div", null,
                __React.createElement("strong", null, w.errorMessage),
                w.requestId && __React.createElement("small", null,
                    "\u0417\u0430\u043F\u0440\u043E\u0441: ",
                    w.requestId),
                w.project && __React.createElement("button", { className: "text-button", type: "button", disabled: !!w.busy || w.riskBusy, onClick: () => guard(() => void w.load(w.project.project_id)) }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"),
                !w.draft && !w.loading && __React.createElement("button", { className: "text-button", type: "button", onClick: () => location.reload() }, "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435")),
            __React.createElement("button", { type: "button", className: "icon-button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0443", onClick: w.clearError },
                __React.createElement(Icon_1.Icon, { name: "close" }))),
        __React.createElement("main", { id: "main", className: "operator-grid", tabIndex: -1 }, w.loading ? __React.createElement("div", { className: "loading-state", role: "status" },
            __React.createElement(Ui_1.Spinner, null),
            "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C \u043F\u043B\u0430\u043D\u2026") : __React.createElement(__React.Fragment, null,
            __React.createElement(Infrastructure_1.Infrastructure, { w: w, onAdvanced: advanced, onData: () => setModal('data') }),
            __React.createElement(SupplyMatrix_1.SupplyMatrix, { w: w, onAdvanced: advanced, onSource: setSource }),
            __React.createElement(ResultPanel_1.ResultPanel, { w: w, onDetails: () => setModal('results') }))),
        __React.createElement("input", { ref: file, className: "sr-only", type: "file", accept: ".json,application/json", "aria-label": "\u0424\u0430\u0439\u043B \u043F\u043B\u0430\u043D\u0430 \u0438\u043B\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0430", onChange: e => {
                const f = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (f) {
                    setModal(null);
                    void w.importFile(f);
                }
            } }),
        __React.createElement("div", { className: `toast ${w.message ? 'visible' : ''}`, role: "status", "aria-live": "polite" }, w.message && __React.createElement(__React.Fragment, null,
            __React.createElement(Icon_1.Icon, { name: "check" }),
            w.message)),
        pending && __React.createElement(Ui_1.Modal, { title: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F?", onClose: () => setPending(null) },
            __React.createElement("p", null, "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u043F\u043B\u0430\u043D\u0430 \u0437\u0430\u043C\u0435\u043D\u0438\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u043F\u0440\u0430\u0432\u043A\u0438."),
            w.errorMessage && __React.createElement(Ui_1.Notice, { tone: "error" }, w.errorMessage),
            __React.createElement("div", { className: "modal-actions" },
                __React.createElement(Ui_1.Button, { onClick: () => setPending(null) }, "\u041E\u0441\u0442\u0430\u0442\u044C\u0441\u044F"),
                __React.createElement(Ui_1.Button, { kind: "danger", onClick: () => { const action = pending; setPending(null); action(); } }, "\u041D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u044C"),
                __React.createElement(Ui_1.Button, { kind: "primary", disabled: !!w.busy || w.riskBusy, onClick: () => {
                        const action = pending;
                        void w.save().then(p => {
                            if (p) {
                                setPending(null);
                                action();
                            }
                        });
                    } }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C"))),
        modal === 'projects' && __React.createElement(Ui_1.Modal, { title: "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u043D\u044B", onClose: () => setModal(null) },
            __React.createElement("div", { className: "saved-plans" },
                w.projects.map(p => __React.createElement("button", { type: "button", key: p.project_id, onClick: () => { setModal(null); guard(() => void w.load(p.project_id)); } },
                    __React.createElement(Icon_1.Icon, { name: "plan" }),
                    __React.createElement("span", null,
                        __React.createElement("strong", null, p.name),
                        __React.createElement("small", null, (0, format_1.scenario)(p.scenario_id))),
                    __React.createElement(Icon_1.Icon, { name: "right" }))),
                !w.projects.length && __React.createElement("p", { className: "help" }, "\u041F\u043B\u0430\u043D \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0440\u0430\u0441\u0447\u0451\u0442\u0430.")),
            __React.createElement("div", { className: "modal-actions" },
                __React.createElement(Ui_1.Button, { onClick: () => { setModal(null); importFile(); } },
                    __React.createElement(Icon_1.Icon, { name: "upload" }),
                    "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C JSON"),
                __React.createElement(Ui_1.Button, { kind: "primary", onClick: () => { setModal(null); guard(() => void w.newPlan()); } },
                    __React.createElement(Icon_1.Icon, { name: "plus" }),
                    "\u041D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u043D"))),
        modal === 'copy' && __React.createElement(Ui_1.Modal, { title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u044E", onClose: () => setModal(null) },
            w.errorMessage && __React.createElement(Ui_1.Notice, { tone: "error" }, w.errorMessage),
            __React.createElement("form", { onSubmit: e => {
                    e.preventDefault();
                    void w.copy(copyName, copyScenario).then(p => {
                        if (p)
                            setModal(null);
                    });
                } },
                __React.createElement("label", { className: "field" },
                    "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043F\u0438\u0438",
                    __React.createElement("input", { required: true, maxLength: 140, autoComplete: "off", value: copyName, onChange: e => setCopyName(e.target.value) })),
                __React.createElement("label", { className: "field" },
                    "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439",
                    __React.createElement("select", { "aria-label": "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u043A\u043E\u043F\u0438\u0438", value: copyScenario, onChange: e => setCopyScenario(e.target.value) },
                        __React.createElement("option", { value: "BASE" }, "BASE"),
                        __React.createElement("option", { value: "MANDATORY_STRESS" }, "STRESS"),
                        !['BASE', 'MANDATORY_STRESS'].includes(copyScenario) && __React.createElement("option", null, copyScenario))),
                __React.createElement("div", { className: "modal-actions" },
                    __React.createElement(Ui_1.Button, { type: "submit", kind: "primary", disabled: !!w.busy || !copyName.trim() }, "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u044E")))),
        modal === 'delete' && __React.createElement(Ui_1.Modal, { title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043B\u0430\u043D?", onClose: () => setModal(null) },
            __React.createElement("p", null,
                "\u00AB",
                w.name,
                "\u00BB \u0438 \u0435\u0433\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B. \u0421\u043A\u0430\u0447\u0430\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F."),
            __React.createElement("div", { className: "modal-actions" },
                __React.createElement(Ui_1.Button, { onClick: () => setModal(null) }, "\u041E\u0442\u043C\u0435\u043D\u0430"),
                __React.createElement(Ui_1.Button, { kind: "danger", onClick: () => { setModal(null); void w.remove(); } }, "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"))),
        modal === 'export' && __React.createElement(Ui_1.Modal, { title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435", onClose: () => setModal(null) },
            __React.createElement("p", { className: "help" }, "JSON-\u043F\u0440\u043E\u0435\u043A\u0442 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043D\u043E\u0432\u0430. CSV-\u0430\u0440\u0445\u0438\u0432 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0440\u0430\u0441\u0447\u0451\u0442\u0430."),
            __React.createElement("div", { className: "export-options" }, [['plan', 'План JSON', 'Текущие решения'], ['project', 'Проект целиком', 'Решения и сохранённый результат'], ['json', 'Результат JSON', 'Ответ модели с происхождением'], ['csv', 'Результат CSV', 'Архив таблиц по годам']].map(([kind, title, subtitle]) => __React.createElement("button", { type: "button", key: kind, disabled: !!w.busy || ((kind === 'json' || kind === 'csv') && (!w.current || w.dirty)), onClick: () => void w.exportFile(kind) },
                __React.createElement(Icon_1.Icon, { name: "download" }),
                __React.createElement("span", null,
                    __React.createElement("strong", null, title),
                    __React.createElement("small", null, subtitle))))),
            w.pair && __React.createElement("div", { className: "modal-actions" },
                __React.createElement(Ui_1.Button, { onClick: () => (0, format_1.jsonDownload)({ format: 'fuel-scenario-comparison-v1', created_at: w.pair.createdAt, basis_plan: w.pair.basis, primary_run: w.project?.last_run, other_plan: w.pair.otherPlan, other_result: w.pair.other, other_origin: 'stateless-api-calc' }, 'scenario-comparison.json') }, "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 JSON"),
                __React.createElement(Ui_1.Button, { onClick: () => {
                        if (w.pair && w.project?.last_run)
                            (0, format_1.downloadBlob)(new Blob([(0, pair_1.scenarioPairCsv)(w.project.last_run, w.pair.otherPlan, w.pair.other)], { type: "text/csv;charset=utf-8" }), "scenario-comparison.csv");
                    } }, "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 CSV"),
                __React.createElement(Ui_1.Button, { disabled: !!w.busy || w.riskBusy, onClick: () => void w.saveOther() }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432\u0442\u043E\u0440\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439"))),
        modal === 'advanced' && __React.createElement(Ui_1.Modal, { title: "\u041F\u043E\u043B\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043B\u0430\u043D\u0430", wide: true, onClose: () => setModal(null) },
            __React.createElement(Ui_1.Notice, null, "\u0412\u0441\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0414\u0443\u0431\u043B\u0438 \u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044F \u043D\u0435 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u044E\u0442\u0441\u044F \u043C\u0430\u0442\u0440\u0438\u0446\u0435\u0439."),
            __React.createElement(PlanEditor_1.PlanEditor, { w: w })),
        modal === 'data' && __React.createElement(Ui_1.Modal, { title: "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440", wide: true, onClose: () => setModal(null) },
            __React.createElement(DataCatalog_1.DataCatalog, { w: w, onImport: importFile })),
        modal === 'results' && __React.createElement(Ui_1.Modal, { title: "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E", wide: true, onClose: () => setModal(null) },
            __React.createElement(ResultDetails_1.ResultDetails, { w: w })),
        modal === 'risk' && __React.createElement(Ui_1.Modal, { title: "\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0438\u0441\u043A\u043E\u0432", wide: true, onClose: () => setModal(null) },
            __React.createElement(RiskPanel_1.RiskPanel, { w: w })),
        modal === 'compare' && __React.createElement(Ui_1.Modal, { title: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u043B\u0430\u043D\u043E\u0432", wide: true, onClose: () => setModal(null) },
            __React.createElement(Compare_1.Compare, { w: w })),
        source && __React.createElement(Ui_1.Modal, { title: source.label, onClose: () => setSource(null) },
            __React.createElement("p", { className: "help" }, "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430 API. \u0427\u0438\u0441\u043B\u0430 \u043D\u0435 \u0432\u0437\u044F\u0442\u044B \u0438\u0437 \u0438\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430."),
            __React.createElement("dl", { className: "reference-values" }, Object.entries(source.reference || { source_id: source.writeId }).filter(([k]) => !['name', 'status'].includes(k)).map(([k, v]) => __React.createElement("div", { key: k },
                __React.createElement("dt", null, catalog_1.columnLabels[k] || k),
                __React.createElement("dd", null, v || 'Не задано'))))),
        modal === 'help' && __React.createElement(Ui_1.Modal, { title: "\u041A\u043E\u043D\u0442\u0443\u0440 2035", onClose: () => setModal(null) },
            __React.createElement("div", { className: "help-steps" },
                __React.createElement("p", null, "\u0412 \u043C\u0430\u0442\u0440\u0438\u0446\u0435 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u043A\u0430\u0437 \u0438 \u0431\u0440\u043E\u043D\u044C \u0437\u0430 \u043B\u044E\u0431\u043E\u0439 \u0433\u043E\u0434. \u0413\u0440\u0430\u0444\u0438\u043A \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0434\u0435\u043D\u044C \u0434\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0435\u0439. \u00AB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\u00BB \u0444\u0438\u043A\u0441\u0438\u0440\u0443\u0435\u0442 \u043F\u043B\u0430\u043D \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442, \u00AB\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0438\u0441\u043A\u043E\u0432\u00BB \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u041C\u043E\u043D\u0442\u0435-\u041A\u0430\u0440\u043B\u043E."),
                __React.createElement("p", null, "BASE \u2014 \u043E\u0431\u044B\u0447\u043D\u044B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F. STRESS \u2014 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0440\u0435\u0441\u0441. \u00AB\u041E\u0431\u0430\u00BB \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0432 \u0434\u0432\u0443\u0445 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F\u0445 \u0431\u0435\u0437 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043B\u0438\u0448\u043D\u0438\u0445 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432. \u0412\u0442\u043E\u0440\u043E\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u043C\u043E\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0447\u0435\u0440\u0435\u0437 \u00AB\u0421\u043A\u0430\u0447\u0430\u0442\u044C\u2026\u00BB."),
                __React.createElement("p", null,
                    "\u0426\u0435\u043D\u0430, \u043C\u043E\u0449\u043D\u043E\u0441\u0442\u044C \u0438 \u0435\u0434\u0438\u043D\u0438\u0446\u044B \u0432\u0437\u044F\u0442\u044B \u0438\u0437 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E API, \u0430 \u043D\u0435 \u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F-\u043F\u0440\u0438\u043C\u0435\u0440\u0430. \u00AB\u0413\u043E\u0434 \u043C\u043E\u0434\u0435\u043B\u0438\u00BB \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u043F\u043E\u043B\u0435 ",
                    __React.createElement("code", null, "year"),
                    " \u043A\u0430\u043A \u0435\u0441\u0442\u044C; \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u0442\u044B \u0444\u0438\u043D\u0430\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u0432\u0432\u043E\u0434\u0430 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 DTO \u043D\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u0435\u0442."),
                __React.createElement(Ui_1.Notice, { tone: "warning" }, "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \u0434\u043D\u0435\u0432\u043D\u043E\u0439 SimulationEngine. \u041C\u0430\u0442\u0435\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u0440\u0438\u0451\u043C\u043A\u0430 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0443 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043C\u043E\u0434\u0435\u043B\u0438. \u0413\u043E\u0434 \u043C\u043E\u0434\u0435\u043B\u0438 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 365 \u0434\u043D\u0435\u0439. \u041C\u043E\u043D\u0442\u0435-\u041A\u0430\u0440\u043B\u043E \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0441\u0432\u043E\u0434\u043A\u0443, \u0431\u0435\u0437 \u0438\u0441\u0442\u043E\u0440\u0438\u0439 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0430\u0432\u0430\u0440\u0438\u0439."),
                __React.createElement("p", { className: "help" }, "\u0412\u0435\u0431-\u0442\u0435\u0441\u0442\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0438 API, \u0430 \u043D\u0435 \u043C\u0430\u0442\u0435\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0443\u044E \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C. \u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441 \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u043C. \u041F\u043E\u043B\u043D\u0430\u044F \u043F\u0440\u0438\u0451\u043C\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0438 \u2014 \u0437\u0430\u0434\u0430\u0447\u0430 \u0435\u0451 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u0432."))));
}

},
"src/api/client.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.ApiError = void 0;
exports.errorText = errorText;
exports.download = download;
const format_js_1 = require("../lib/format.js");
class ApiError extends Error {
    status;
    code;
    requestId;
    conflictContext;
    constructor(status, code, message, requestId = '', conflictContext) {
        super(message);
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.conflictContext = conflictContext;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
function errorText(error) {
    if (error instanceof ApiError) {
        if (error.status === 409 && error.conflictContext === 'revision')
            return 'План изменён в другом окне. Откройте свежую версию или сохраните свои правки отдельной копией.';
        if (error.status === 409 && error.conflictContext === 'result')
            return 'Результат отсутствует или устарел. Выполните пересчёт для текущей версии плана и повторите выгрузку.';
        return error.message;
    }
    return error instanceof Error ? error.message : 'Не удалось выполнить действие. Повторите попытку.';
}
async function checked(response, conflictContext) {
    if (response.ok)
        return response;
    let value = {};
    try {
        value = await response.json();
    }
    catch { /* proxy can return HTML; never show it to the user */ }
    const detail = value.detail;
    let message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e) => {
        const location = Array.isArray(e.loc) ? e.loc.filter(x => x !== 'body').join(' → ') : '';
        return `${location ? location + ': ' : ''}${e.msg || 'Проверьте значение'}`;
    }).join('\n') : '';
    if (!message)
        message = { 401: 'Для доступа к рабочему пространству нужна авторизация.', 413: 'Файл или запрос слишком большой.', 502: 'Backend недоступен. Проверьте запуск сервера.', 503: 'Расчётный сервис недоступен. Повторите позже.' }[response.status] || `Запрос не выполнен (HTTP ${response.status}).`;
    throw new ApiError(response.status, String(value.code || `HTTP_${response.status}`), message, String(value.request_id || response.headers.get('X-Request-ID') || ''), conflictContext);
}
async function request(path, init = {}, conflictContext) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
        return await checked(await fetch('/api' + path, { ...init, signal: controller.signal, cache: 'no-store' }), conflictContext);
    }
    catch (error) {
        if (error instanceof ApiError)
            throw error;
        if (controller.signal.aborted)
            throw new Error('Сервер не ответил за 2 минуты. Расчёт мог продолжиться — обновите проект перед повторной попыткой.');
        throw new Error('Нет соединения с сервером. Проверьте сеть и повторите действие.');
    }
    finally {
        clearTimeout(timer);
    }
}
async function json(path, init, conflictContext) {
    const response = await request(path, init, conflictContext);
    try {
        return await response.json();
    }
    catch {
        throw new Error('Сервер вернул не JSON. Проверьте адрес и проксирование /api.');
    }
}
function body(value, method = 'POST') { return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }; }
async function upload(path, file) { const form = new FormData(); form.append('file', file); return json(path, { method: 'POST', body: form }); }
async function download(path, fallback, init, conflictContext) {
    const response = await request(path, init, conflictContext);
    const disposition = response.headers.get('Content-Disposition') || '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || fallback;
    (0, format_js_1.downloadBlob)(await response.blob(), (0, format_js_1.safeFilename)(filename));
}
exports.api = {
    simulate: (plan) => json('/calc', body(plan)),
    analyzeRisk: (plan) => json('/calc/risk', body(plan)),
    meta: () => json('/meta'), catalog: () => json('/catalog'), template: () => json('/calc/template'),
    async list() {
        const all = [];
        let offset = 0;
        for (;;) {
            const page = await json(`/projects?limit=100&offset=${offset}`);
            all.push(...page.items);
            offset += page.items.length;
            if (offset >= page.total || !page.items.length)
                break;
        }
        return all;
    },
    project: (id) => json(`/projects/${encodeURIComponent(id)}`),
    create: (name, plan) => json('/projects', body({ name, plan })),
    update: (id, name, plan, revision) => json(`/projects/${encodeURIComponent(id)}`, body({ name, plan, expected_revision: revision }, 'PUT'), 'revision'),
    calculate: (id, revision) => json(`/projects/${encodeURIComponent(id)}/calculate`, body({ expected_revision: revision }), 'revision'),
    async remove(id, revision) { await request(`/projects/${encodeURIComponent(id)}?expected_revision=${revision}`, { method: 'DELETE' }, 'revision'); },
    importPlan: (file) => upload('/plans/import', file),
    importProject: (file) => upload('/projects/import', file),
    validate: (plan) => json('/plans/validate', body(plan)),
    compare: (ids) => json('/projects/compare', body({ project_ids: ids })),
    exportPlan: (plan) => download('/plans/export', 'plan.json', body(plan)),
    exportProject: (id) => download(`/projects/${encodeURIComponent(id)}/export`, 'project.json'),
    exportResult: (id, format) => download(`/projects/${encodeURIComponent(id)}/result/export?format=${format}`, `result.${format === 'csv' ? 'zip' : 'json'}`, undefined, 'result'),
};

},
"src/api/types.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"src/components/AnalyticsChart.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costColors = exports.costNames = exports.costKeys = exports.palette = void 0;
exports.AnalyticsChart = AnalyticsChart;
exports.FinanceChart = FinanceChart;
exports.ServiceRing = ServiceRing;
const react_1 = require("react");
const format_1 = require("../lib/format");
const plot_1 = require("../lib/plot");
const useMotion_1 = require("./useMotion");
exports.palette = { blue: '#72cfff', green: '#7de0bc', amber: '#edbe77', purple: '#b1a3fa', muted: '#889bab', red: '#f0a395' };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
function usePlotSize() {
    const [node, setNode] = (0, react_1.useState)(null);
    const [size, setSize] = (0, react_1.useState)({ width: 450, height: 220 });
    (0, react_1.useLayoutEffect)(() => {
        if (!node)
            return;
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            if (!rect)
                return;
            const width = Math.max(260, Math.round(rect.width)), height = Math.max(130, Math.round(rect.height));
            setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [node]);
    return { ref: setNode, ...size };
}
/** Coordinates only: the model supplies every value; missing values break the trace. */
function AnalyticsChart({ years, series, unit, selected, onSelect }) {
    const uid = (0, react_1.useId)().replace(/:/g, ''), [hover, setHover] = (0, react_1.useState)(null);
    const { ref, width, height } = usePlotSize(), pad = { left: 42, right: 16, top: 20, bottom: 26 };
    const values = series.flatMap(s => s.values.filter(finite));
    const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low;
    const min = low < 0 ? low - span * .06 : 0, max = high + span * .13;
    const x = (i) => pad.left + (width - pad.left - pad.right) * (years.length === 1 ? .5 : i / (years.length - 1));
    const y = (v) => height - pad.bottom - (v - min) / (max - min) * (height - pad.top - pad.bottom);
    const index = hover ?? years.indexOf(selected);
    const yearX = years.map((_, i) => x(i));
    const gridValues = [0, 1, 2, 3].map(i => min + (max - min) * i / 3);
    const selectionLeft = index >= 0 ? Math.max(pad.left, x(index) - 17) : pad.left;
    const selectionWidth = index >= 0 ? Math.min(width - pad.right, x(index) + 17) - selectionLeft : 0;
    const geometry = (0, useMotion_1.useMotionNumbers)([
        ...yearX,
        ...gridValues.map(y),
        y(0),
        selectionLeft,
        selectionWidth,
        ...series.flatMap(s => s.values.filter(finite).map(y)),
    ], `${years.join(',')}|${series.map(s => `${s.key}:${s.values.map(v => finite(v) ? '1' : '0').join('')}`).join('|')}`);
    let cursor = 0;
    const drawnX = geometry.slice(cursor, cursor += years.length);
    const drawnGridY = geometry.slice(cursor, cursor += gridValues.length);
    const drawnZeroY = geometry[cursor++];
    const drawnSelectionLeft = geometry[cursor++], drawnSelectionWidth = geometry[cursor++];
    const drawnSeriesY = series.map(s => s.values.map(value => finite(value) ? geometry[cursor++] : undefined));
    if (!years.length || !values.length)
        return __React.createElement("div", { className: "chart-empty" }, "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u0440\u044F\u0434 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0433\u0440\u0430\u0444\u0438\u043A\u0430.");
    return __React.createElement("div", { className: "analytics-chart", onMouseLeave: () => setHover(null) },
        __React.createElement("div", { className: "plot-svg-frame", ref: ref },
            __React.createElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${unit}: ${series.map(s => s.label).join(', ')}` },
                __React.createElement("defs", null, series.map(s => __React.createElement("linearGradient", { key: s.key, id: `${uid}-${s.key}`, x1: "0", y1: "0", x2: "0", y2: "1" },
                    __React.createElement("stop", { offset: "0%", stopColor: s.color, stopOpacity: ".24" }),
                    __React.createElement("stop", { offset: "100%", stopColor: s.color, stopOpacity: ".015" })))),
                gridValues.map((v, i) => __React.createElement("g", { key: i },
                    __React.createElement("line", { x1: pad.left, x2: width - pad.right, y1: drawnGridY[i], y2: drawnGridY[i], stroke: "var(--grid)", strokeDasharray: "3 5" }),
                    __React.createElement("text", { x: pad.left - 9, y: drawnGridY[i] + 4, textAnchor: "end", className: "axis-label" }, (0, format_1.number)(Math.round(v))))),
                __React.createElement("text", { x: pad.left, y: 10, className: "axis-label" }, unit),
                index >= 0 && __React.createElement("rect", { x: drawnSelectionLeft, y: pad.top, width: drawnSelectionWidth, height: height - pad.top - pad.bottom, fill: "var(--chart-selection)", rx: "8" }),
                series.map((s, seriesIndex) => {
                    const segments = [];
                    let points = [];
                    years.forEach((_, i) => {
                        const v = s.values[i];
                        if (finite(v))
                            points.push({ x: drawnX[i], y: drawnSeriesY[seriesIndex][i] });
                        else {
                            if (points.length)
                                segments.push(points);
                            points = [];
                        }
                    });
                    if (points.length)
                        segments.push(points);
                    return __React.createElement("g", { key: s.key },
                        segments.map((pts, j) => { const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '); return __React.createElement("g", { key: j },
                            s.area && pts.length > 1 && __React.createElement("path", { d: `${d} L${pts.at(-1).x},${drawnZeroY} L${pts[0].x},${drawnZeroY} Z`, fill: `url(#${uid}-${s.key})` }),
                            __React.createElement("path", { d: d, stroke: s.color, strokeWidth: s.dashed ? 1.8 : 2.6, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", strokeDasharray: s.dashed ? '5 6' : undefined })); }),
                        years.map((_, i) => finite(s.values[i]) ? __React.createElement("g", { key: i },
                            i === index && __React.createElement("circle", { cx: drawnX[i], cy: drawnSeriesY[seriesIndex][i], r: "8", fill: s.color, opacity: ".12" }),
                            __React.createElement("circle", { cx: drawnX[i], cy: drawnSeriesY[seriesIndex][i], r: i === index ? 3.8 : 2.4, fill: "var(--panel)", stroke: s.color, strokeWidth: "2" })) : null));
                }),
                years.map((year, i) => __React.createElement("g", { key: year },
                    __React.createElement("text", { x: drawnX[i], y: height - 5, textAnchor: "middle", className: `axis-label ${year === selected ? 'selected-axis' : ''}` }, year),
                    __React.createElement("rect", { className: "chart-hit", x: drawnX[i] - 20, y: pad.top, width: "40", height: height - pad.top, fill: "transparent", role: "button", "aria-label": `Показатели за ${year}`, tabIndex: 0, onMouseEnter: () => setHover(i), onFocus: () => setHover(i), onBlur: () => setHover(null), onClick: () => onSelect(year), onKeyDown: e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect(year);
                            }
                        } },
                        __React.createElement("title", null,
                            year,
                            ": ",
                            series.map(s => `${s.label}: ${(0, format_1.number)(s.values[i])} ${unit}`).join('; '))))))),
        __React.createElement("div", { className: "plot-legend" }, series.map(s => __React.createElement("span", { key: s.key },
            __React.createElement("i", { className: s.dashed ? 'dashed' : '', style: { background: s.color } }),
            s.label,
            __React.createElement("strong", null, (0, format_1.number)(s.values[index]))))));
}
exports.costKeys = ['procurement', 'reservation', 'holding', 'capex', 'opex'];
exports.costNames = ['Закупка', 'Бронь', 'Хранение', 'CAPEX', 'OPEX'];
exports.costColors = [exports.palette.blue, exports.palette.purple, exports.palette.green, exports.palette.amber, exports.palette.muted];
function FinanceChart({ rows, selected, onSelect }) {
    const { ref, width, height } = usePlotSize();
    const left = 42, right = 16, top = 22, bottom = 27;
    // This sum only positions stacked rectangles. Displayed total remains the API total.
    const stacks = rows.map(row => (0, plot_1.signedStack)(exports.costKeys.map(k => row[k])));
    const min = Math.min(0, ...stacks.map(s => s.min)) * 1.1, max = Math.max(1, ...stacks.map(s => s.max)) * 1.1, cell = (width - left - right) / Math.max(1, rows.length), bw = Math.min(36, cell * .62), h = height - top - bottom;
    const y = (value) => height - bottom - (value - min) / (max - min) * h;
    const gridValues = [0, 1, 2, 3].map(i => min + (max - min) * i / 3);
    const geometry = (0, useMotion_1.useMotionNumbers)([
        ...gridValues.map(y), cell, bw, h,
        ...rows.flatMap((_, i) => {
            const rowX = left + cell * (i + .5);
            return [rowX, ...stacks[i].segments.flatMap(({ from, to }) => [Math.min(y(from), y(to)), Math.abs(y(from) - y(to))])];
        }),
    ], rows.map((row, i) => `${row.year}:${stacks[i].segments.map(segment => segment.index).join(',')}`).join('|'));
    let cursor = 0;
    const drawnGridY = geometry.slice(cursor, cursor += gridValues.length);
    const drawnCell = geometry[cursor++], drawnBw = geometry[cursor++], drawnH = geometry[cursor++];
    const drawnRows = rows.map((_, i) => ({
        x: geometry[cursor++],
        segments: stacks[i].segments.map(() => ({ y: geometry[cursor++], height: geometry[cursor++] })),
    }));
    if (!rows.length)
        return __React.createElement("div", { className: "chart-empty" }, "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u044B.");
    const current = rows.find(f => f.year === selected);
    return __React.createElement("div", { className: "analytics-chart" },
        __React.createElement("div", { className: "plot-svg-frame", ref: ref },
            __React.createElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432 \u043F\u043E \u0433\u043E\u0434\u0430\u043C, \u043C\u043B\u043D \u0443.\u0435." },
                gridValues.map((v, i) => __React.createElement("g", { key: i },
                    __React.createElement("line", { x1: left, x2: width - right, y1: drawnGridY[i], y2: drawnGridY[i], stroke: "var(--grid)", strokeDasharray: "3 5" }),
                    __React.createElement("text", { className: "axis-label", x: left - 9, y: drawnGridY[i] + 4, textAnchor: "end" }, (0, format_1.number)(Math.round(v))))),
                __React.createElement("text", { x: left, y: "10", className: "axis-label" }, "\u043C\u043B\u043D \u0443.\u0435."),
                rows.map((row, i) => {
                    const drawn = drawnRows[i];
                    return __React.createElement("g", { key: row.year },
                        row.year === selected && __React.createElement("rect", { x: drawn.x - drawnBw / 2 - 5, y: top - 5, width: drawnBw + 10, height: drawnH + 6, rx: "7", fill: "var(--chart-selection)" }),
                        stacks[i].segments.map(({ index: k }, segmentIndex) => { const key = exports.costKeys[k], segment = drawn.segments[segmentIndex]; return __React.createElement("rect", { key: key, x: drawn.x - drawnBw / 2, y: segment.y, width: drawnBw, height: segment.height, fill: exports.costColors[k], rx: "2", opacity: row.year === selected ? 1 : .76 },
                            __React.createElement("title", null,
                                row.year,
                                " \u00B7 ",
                                exports.costNames[k],
                                ": ",
                                (0, format_1.number)(row[key]),
                                " \u043C\u043B\u043D \u0443.\u0435.")); }),
                        __React.createElement("text", { className: "axis-label", x: drawn.x, y: height - 5, textAnchor: "middle" }, row.year),
                        __React.createElement("rect", { role: "button", tabIndex: 0, className: "chart-hit", "aria-label": `Расходы за ${row.year}`, x: drawn.x - drawnCell / 2, y: top, width: drawnCell, height: drawnH + 25, fill: "transparent", onClick: () => onSelect(row.year), onKeyDown: e => {
                                if (['Enter', ' '].includes(e.key)) {
                                    e.preventDefault();
                                    onSelect(row.year);
                                }
                            } }));
                }))),
        __React.createElement("div", { className: "plot-legend costs" }, exports.costKeys.map((key, i) => __React.createElement("span", { key: key },
            __React.createElement("i", { style: { background: exports.costColors[i] } }),
            exports.costNames[i],
            __React.createElement("strong", null, (0, format_1.number)(current?.[key]))))));
}
function ServiceRing({ total, critical }) {
    const radius = 32, circ = 2 * Math.PI * radius;
    const geometry = (0, useMotion_1.useMotionNumbers)([
        finite(total) ? Math.max(0, Math.min(1, total)) : 0,
        finite(critical) ? Math.max(0, Math.min(1, critical)) : 0,
    ], `${finite(total) ? 1 : 0}${finite(critical) ? 1 : 0}`);
    return __React.createElement("svg", { className: "service-ring", width: "86", height: "86", viewBox: "0 0 86 86", role: "img", "aria-label": "\u041E\u0431\u0449\u0438\u0439 \u0438 \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u0435\u0440\u0432\u0438\u0441" },
        __React.createElement("circle", { cx: "43", cy: "43", r: radius, fill: "none", stroke: "var(--track)", strokeWidth: "4" }),
        __React.createElement("circle", { cx: "43", cy: "43", r: "23", fill: "none", stroke: "var(--track)", strokeWidth: "4" }),
        finite(total) && __React.createElement("circle", { cx: "43", cy: "43", r: radius, fill: "none", stroke: exports.palette.blue, strokeWidth: "4", strokeLinecap: "round", strokeDasharray: `${geometry[0] * circ} ${circ}`, transform: "rotate(-90 43 43)" }),
        finite(critical) && __React.createElement("circle", { cx: "43", cy: "43", r: "23", fill: "none", stroke: exports.palette.green, strokeWidth: "4", strokeLinecap: "round", strokeDasharray: `${geometry[1] * 2 * Math.PI * 23} ${2 * Math.PI * 23}`, transform: "rotate(-90 43 43)" }),
        __React.createElement("path", { d: "M37 43h12 M43 37v12", stroke: "var(--muted)", strokeWidth: "1.4" }));
}

},
"src/components/Chart.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chart = Chart;
const react_1 = require("react");
const format_1 = require("../lib/format");
/** Geometry only: receives model values; does not compute domain KPIs. */
function Chart({ years, series, unit = 'т' }) {
    const [hover, setHover] = (0, react_1.useState)(null);
    const id = (0, react_1.useId)().replaceAll(':', '');
    const width = 900, height = 290, left = 52, right = 25, top = 20, bottom = 38;
    const data = series.flatMap(s => s.values).filter((n) => typeof n === 'number' && Number.isFinite(n));
    if (!years.length || !data.length)
        return __React.createElement("p", { className: "empty-cell" }, "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0440\u044F\u0434 \u0434\u043B\u044F \u0433\u0440\u0430\u0444\u0438\u043A\u0430.");
    const min = Math.min(0, ...data), max = Math.max(1, ...data);
    const range = max - min;
    const x = (i) => left + (years.length === 1 ? .5 : i / (years.length - 1)) * (width - left - right);
    const y = (v) => top + (max - v) / range * (height - top - bottom);
    return __React.createElement("div", { className: "chart" },
        __React.createElement("svg", { role: "img", "aria-label": `График: ${series.map(s => s.label).join(', ')}. Единицы: ${unit}. Точные значения приведены в таблице.`, viewBox: `0 0 ${width} ${height}`, onMouseLeave: () => setHover(null) },
            __React.createElement("defs", null,
                __React.createElement("linearGradient", { id: 'area' + id, x1: "0", y1: "0", x2: "0", y2: "1" },
                    __React.createElement("stop", { offset: "0%", stopColor: series[0]?.color, stopOpacity: ".13" }),
                    __React.createElement("stop", { offset: "100%", stopColor: series[0]?.color, stopOpacity: "0" }))),
            [0, .25, .5, .75, 1].map(t => { const value = min + range * t; return __React.createElement("g", { key: t },
                __React.createElement("line", { x1: left, x2: width - right, y1: y(value), y2: y(value), className: "chart-grid" }),
                __React.createElement("text", { x: left - 12, y: y(value) + 4, textAnchor: "end", className: "chart-text" }, (0, format_1.number)(value))); }),
            series.map((s, si) => {
                let d = '';
                let valid = false;
                for (let i = 0; i < years.length; i++) {
                    const v = s.values[i];
                    if (typeof v !== 'number' || !Number.isFinite(v)) {
                        valid = false;
                        continue;
                    }
                    d += `${valid ? 'L' : 'M'}${x(i)} ${y(v)} `;
                    valid = true;
                }
                const all = s.values.length === years.length && s.values.every(v => typeof v === 'number' && Number.isFinite(v));
                return __React.createElement("g", { key: s.key },
                    si === 0 && all && __React.createElement("path", { d: d + `L ${x(years.length - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`, fill: `url(#area${id})` }),
                    __React.createElement("path", { className: "chart-line", d: d, fill: "none", stroke: s.color, strokeWidth: s.dashed ? 2 : 2.5, strokeDasharray: s.dashed ? '5 6' : undefined, strokeLinecap: "round", strokeLinejoin: "round" }),
                    years.map((_, i) => { const v = s.values[i]; return typeof v === 'number' && Number.isFinite(v) ? __React.createElement("circle", { key: i, cx: x(i), cy: y(v), r: hover === i ? 5 : 3.2, fill: "var(--surface)", stroke: s.color, strokeWidth: "2" }) : null; }));
            }),
            years.map((yr, i) => __React.createElement("g", { key: yr },
                __React.createElement("text", { x: x(i), y: height - 9, textAnchor: "middle", className: "chart-text" }, yr),
                __React.createElement("rect", { x: x(i) - (width - left - right) / Math.max(2, years.length - 1) / 2, width: (width - left - right) / Math.max(2, years.length - 1), y: top, height: height - top, fill: "transparent", onMouseEnter: () => setHover(i) },
                    __React.createElement("title", null,
                        yr,
                        ": ",
                        series.map(s => `${s.label} ${(0, format_1.number)(s.values[i])} ${unit}`).join('; '))))),
            hover !== null && __React.createElement("line", { x1: x(hover), x2: x(hover), y1: top, y2: height - bottom, stroke: "var(--border)", strokeDasharray: "3 5", pointerEvents: "none" })),
        __React.createElement("div", { className: "chart-legend" }, series.map(s => __React.createElement("span", { key: s.key },
            __React.createElement("i", { style: { background: s.color } }),
            s.label,
            hover !== null && __React.createElement("strong", null,
                (0, format_1.number)(s.values[hover]),
                " ",
                unit)))));
}

},
"src/components/Controls.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepNumber = StepNumber;
exports.Range = Range;
exports.Toggle = Toggle;
const react_1 = require("react");
const Icon_1 = require("./Icon");
function StepNumber({ value, onChange, label, step = 1, disabled = false, compact = false, onFocus, placeholder = '—' }) {
    const valid = value === null || (Number.isFinite(value) && value >= 0);
    const move = (delta) => onChange(Math.max(0, Math.round(((value && Number.isFinite(value) ? value : 0) + delta) * 100) / 100));
    return __React.createElement("div", { className: `step-number ${compact ? 'small' : ''} ${!valid ? 'invalid' : ''}` },
        !compact && __React.createElement("button", { type: "button", "aria-label": `Уменьшить: ${label}`, disabled: disabled, onClick: () => move(-step) },
            __React.createElement(Icon_1.Icon, { name: "minus", size: 12 })),
        __React.createElement("input", { type: "number", inputMode: "decimal", autoComplete: "off", "aria-label": label, "aria-invalid": !valid, disabled: disabled, min: 0, step: "any", placeholder: placeholder, value: value === null || !Number.isFinite(value) ? '' : value, onFocus: onFocus, onChange: e => onChange(e.target.value === '' ? NaN : e.target.valueAsNumber) }),
        !compact && __React.createElement("button", { type: "button", "aria-label": `Увеличить: ${label}`, disabled: disabled, onClick: () => move(step) },
            __React.createElement(Icon_1.Icon, { name: "plus", size: 12 })));
}
function Range({ value, max, label, onChange, disabled = false, step = 1 }) {
    const id = (0, react_1.useId)();
    const safe = value !== null && Number.isFinite(value) ? Math.max(0, value) : 0;
    const top = Math.max(max, safe, 1);
    return __React.createElement("input", { id: id, className: "range", type: "range", "aria-label": label, "aria-valuetext": `${value === null ? 'Не задано' : value}`, min: 0, max: top, step: step, value: safe, disabled: disabled, onChange: e => onChange(e.target.valueAsNumber), style: { backgroundSize: `${100 * safe / top}% 100%` } });
}
function Toggle({ label, checked, onChange, disabled = false }) {
    return __React.createElement("button", { className: "toggle", type: "button", role: "switch", "aria-label": label, "aria-checked": checked, disabled: disabled, onClick: () => onChange(!checked) },
        __React.createElement("span", null));
}

},
"src/components/DailyChart.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyChart = DailyChart;
const react_1 = require("react");
const daily_1 = require("../lib/daily");
const format_1 = require("../lib/format");
const useMotion_1 = require("./useMotion");
function usePlotSize() {
    const [node, setNode] = (0, react_1.useState)(null);
    const [size, setSize] = (0, react_1.useState)({ width: 760, height: 300 });
    (0, react_1.useLayoutEffect)(() => {
        if (!node)
            return;
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            if (!rect)
                return;
            const width = Math.max(320, Math.round(rect.width));
            const height = Math.max(210, Math.round(rect.height));
            setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [node]);
    return { ref: setNode, ...size };
}
function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function scenarioLabel(result) {
    return result.scenario_id === 'BASE' ? 'BASE' : result.scenario_id === 'MANDATORY_STRESS' ? 'STRESS' : result.scenario_id;
}
function segments(rows, drawnY, x) {
    const result = [];
    let points = [];
    let previousDay = null;
    for (const row of rows) {
        const y = drawnY.get(row.day);
        if (y === undefined || (previousDay !== null && row.day !== previousDay + 1)) {
            if (points.length)
                result.push(points.join(' '));
            points = [];
        }
        if (y !== undefined) {
            points.push(`${points.length ? 'L' : 'M'}${x(row.day)},${y}`);
            previousDay = row.day;
        }
        else {
            previousDay = null;
        }
    }
    if (points.length)
        result.push(points.join(' '));
    return result;
}
function DailyChart({ result, other = null, year, onSelectDay, onProposeDeliveryDate, range, selectedDay = null }) {
    const [drag, setDrag] = (0, react_1.useState)(null);
    const [focusedDay, setFocusedDay] = (0, react_1.useState)(1);
    const primarySupported = (0, format_1.supportedUnits)(result.units);
    const primary = primarySupported ? (0, daily_1.projectDailyTrace)(result, year, range) : [];
    const secondary = primarySupported && other && (0, format_1.supportedUnits)(other.units) ? (0, daily_1.projectDailyTrace)(other, year, range) : [];
    const [start, end] = (0, daily_1.modelDayRange)(range);
    const ticks = (0, daily_1.modelWeekTicks)([start, end]);
    const { ref, width, height } = usePlotSize();
    const pad = { left: 48, right: 18, top: 24, bottom: 48 };
    const values = [...primary, ...secondary].map(row => row.closing_inventory_t).filter(finite);
    const max = Math.max(1, ...values) * 1.08;
    const x = (day) => pad.left + (width - pad.left - pad.right) * (end === start ? .5 : (day - start) / (end - start));
    const y = (value) => height - pad.bottom - value / max * (height - pad.top - pad.bottom);
    const gridValues = [0, .25, .5, .75, 1].map(part => max * part);
    const primaryFinite = primary.filter(row => finite(row.closing_inventory_t));
    const secondaryFinite = secondary.filter(row => finite(row.closing_inventory_t));
    const targetGeometry = [
        ...gridValues.map(y),
        ...primaryFinite.map(row => y(row.closing_inventory_t)),
        ...secondaryFinite.map(row => y(row.closing_inventory_t)),
    ];
    const topology = `${year}|${start}:${end}|${primary.map(row => `${row.day}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}|${secondary.map(row => `${row.day}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}`;
    const geometry = (0, useMotion_1.useMotionNumbers)(targetGeometry, topology);
    let cursor = 0;
    const drawnGrid = geometry.slice(cursor, cursor += gridValues.length);
    const primaryY = new Map(primaryFinite.map(row => [row.day, geometry[cursor++]]));
    const secondaryY = new Map(secondaryFinite.map(row => [row.day, geometry[cursor++]]));
    const selected = selectedDay === null ? primary.at(-1) : (0, daily_1.dailyRecordAt)(result, year, selectedDay);
    if (!primarySupported)
        return __React.createElement("div", { className: "daily-chart chart-empty", "data-testid": "daily-chart" }, "\u0415\u0434\u0438\u043D\u0438\u0446\u044B \u0434\u043D\u0435\u0432\u043D\u043E\u0433\u043E \u0440\u044F\u0434\u0430 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F.");
    if (!values.length)
        return __React.createElement("div", { className: "daily-chart chart-empty", "data-testid": "daily-chart" },
            "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0437\u0430\u043F\u0430\u0441 \u0437\u0430 ",
            year,
            ".");
    const hitWidth = Math.max(2, (width - pad.left - pad.right) / Math.max(1, end - start + 1));
    return __React.createElement("div", { className: "daily-chart", "data-testid": "daily-chart" },
        __React.createElement("div", { className: "daily-chart-frame", ref: ref },
            __React.createElement("svg", { className: "daily-chart-svg", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `Дневной запас за ${year}, дни модели ${start}–${end}` },
                drawnGrid.map((gridY, index) => __React.createElement("g", { key: index },
                    __React.createElement("line", { className: "daily-grid", x1: pad.left, x2: width - pad.right, y1: gridY, y2: gridY }),
                    __React.createElement("text", { className: "daily-axis-label", x: pad.left - 8, y: gridY + 4, textAnchor: "end" }, (0, format_1.number)(gridValues[index])))),
                __React.createElement("text", { className: "daily-axis-label", x: pad.left, y: 13 }, "\u0442"),
                ticks.map(day => __React.createElement("g", { key: day },
                    __React.createElement("line", { className: "daily-grid daily-week-grid", x1: x(day), x2: x(day), y1: pad.top, y2: height - pad.bottom }),
                    __React.createElement("text", { className: "daily-axis-label", x: x(day), y: height - 10, textAnchor: "end", transform: `rotate(-55 ${x(day)} ${height - 10})` }, day))),
                primary.filter(row => finite(row.shortage_t) && row.shortage_t > 0).map(row => __React.createElement("rect", { key: `shortage-${row.day}`, className: "daily-shortage-band", x: x(row.day) - hitWidth / 2, y: pad.top, width: hitWidth, height: height - pad.top - pad.bottom })),
                secondary.length > 0 && segments(secondary, secondaryY, x).map((path, index) => __React.createElement("path", { key: index, className: "daily-inventory-line other", d: path })),
                segments(primary, primaryY, x).map((path, index) => __React.createElement("path", { key: index, className: "daily-inventory-line", d: path })),
                primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => {
                    const cy = primaryY.get(row.day) ?? pad.top + 8;
                    return __React.createElement("path", { key: `receipt-${row.day}`, className: "daily-receipt-marker", d: `M${x(row.day)},${cy - 6} l6,6 -6,6 -6,-6 Z` },
                        __React.createElement("title", null,
                            "\u0414\u0435\u043D\u044C ",
                            row.day,
                            ": \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 ",
                            (0, format_1.number)(row.delivered_t),
                            " \u0442"));
                }),
                selectedDay !== null && selectedDay >= start && selectedDay <= end && __React.createElement("line", { className: "daily-selected", x1: x(selectedDay), x2: x(selectedDay), y1: pad.top, y2: height - pad.bottom }),
                onSelectDay && primary.map(row => __React.createElement("rect", { key: `hit-${row.day}`, className: "daily-hit", x: x(row.day) - hitWidth / 2, y: pad.top, width: hitWidth, height: height - pad.top - pad.bottom, fill: "transparent", role: "button", tabIndex: row.day === (primary.some(p => p.day === focusedDay) ? focusedDay : primary[0]?.day) ? 0 : -1, onFocus: () => setFocusedDay(row.day), "aria-label": `День модели ${row.day}`, onClick: () => onSelectDay(row.day), onKeyDown: event => {
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault();
                            const next = primary[primary.indexOf(row) + (event.key === 'ArrowRight' ? 1 : -1)];
                            if (next) {
                                setFocusedDay(next.day);
                                event.currentTarget.ownerSVGElement?.querySelector(`[aria-label="День модели ${next.day}"]`)?.focus();
                            }
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelectDay(row.day);
                        }
                    } },
                    __React.createElement("title", null,
                        "\u0414\u0435\u043D\u044C ",
                        row.day,
                        ": \u0437\u0430\u043F\u0430\u0441 ",
                        (0, format_1.number)(row.closing_inventory_t),
                        " \u0442; \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 ",
                        (0, format_1.number)(row.delivered_t),
                        " \u0442; \u0434\u0435\u0444\u0438\u0446\u0438\u0442 ",
                        (0, format_1.number)(row.shortage_t),
                        " \u0442"))),
                onProposeDeliveryDate && primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => __React.createElement("circle", { key: `drag-${row.day}`, className: "delivery-drag", cx: x(row.day), cy: primaryY.get(row.day) ?? pad.top + 8, r: 10, role: "button", tabIndex: 0, "aria-label": `Перенести поступление: день ${row.day}`, onPointerDown: event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDrag({ from: row.day, to: row.day }); }, onPointerMove: event => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId))
                            return;
                        const bounds = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                        const px = (event.clientX - bounds.left) * width / bounds.width;
                        const day = Math.max(start, Math.min(end, Math.round(start + (px - pad.left) / (width - pad.left - pad.right) * (end - start))));
                        setDrag({ from: row.day, to: day });
                    }, onPointerUp: event => { if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(event.pointerId); if (drag && drag.to !== drag.from)
                        onProposeDeliveryDate(drag.from, drag.to);
                    else
                        onSelectDay?.(row.day); setDrag(null); }, onPointerCancel: () => setDrag(null), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onProposeDeliveryDate(row.day, row.day);
                    } } },
                    __React.createElement("title", null, "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u044C \u0434\u0430\u0442\u0443 \u0434\u043B\u044F \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u044F"))),
                drag && __React.createElement("g", { className: "delivery-drag-preview" },
                    __React.createElement("line", { x1: x(drag.to), x2: x(drag.to), y1: pad.top, y2: height - pad.bottom }),
                    __React.createElement("text", { x: Math.min(width - 90, Math.max(pad.left, x(drag.to) + 8)), y: pad.top + 14 },
                        "\u0414\u0435\u043D\u044C ",
                        drag.to)))),
        __React.createElement("div", { className: "daily-legend" },
            __React.createElement("span", { className: "daily-legend-item" },
                "\u0414\u0435\u043D\u044C \u043C\u043E\u0434\u0435\u043B\u0438 ",
                __React.createElement("strong", null, selected?.day ?? '—')),
            __React.createElement("span", { className: "daily-legend-item" },
                __React.createElement("i", { className: "daily-inventory-line" }),
                scenarioLabel(result),
                " ",
                __React.createElement("strong", null,
                    (0, format_1.number)(selected?.closing_inventory_t),
                    " \u0442")),
            other && secondary.length > 0 && __React.createElement("span", { className: "daily-legend-item" },
                __React.createElement("i", { className: "daily-inventory-line other" }),
                scenarioLabel(other),
                " ",
                __React.createElement("strong", null,
                    (0, format_1.number)(selectedDay === null ? secondary.at(-1)?.closing_inventory_t : (0, daily_1.dailyRecordAt)(other, year, selectedDay)?.closing_inventory_t),
                    " \u0442")),
            __React.createElement("span", { className: "daily-legend-item" },
                __React.createElement("i", { className: "daily-receipt-marker" }),
                "\u041F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 ",
                __React.createElement("strong", null,
                    (0, format_1.number)(selected?.delivered_t),
                    " \u0442")),
            __React.createElement("span", { className: "daily-legend-item" },
                __React.createElement("i", { className: "daily-shortage-band" }),
                "\u0414\u0435\u0444\u0438\u0446\u0438\u0442 ",
                __React.createElement("strong", null,
                    (0, format_1.number)(selected?.shortage_t),
                    " \u0442"))));
}

},
"src/components/Icon.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Icon = Icon;
exports.Brand = Brand;
const paths = {
    minus: 'M5 12h14',
    moon: 'M20.9 13A9 9 0 0 1 11 3.1a9 9 0 1 0 9.9 9.9z',
    globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
    box: 'm12 3 9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v8 M7 5l10 6',
    lock: 'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
    sliders: 'M4 6h5 M15 6h5 M4 12h10 M18 12h2 M4 18h2 M12 18h8 M9 3v6 M14 9v6 M6 15v6',
    chart: 'M4 3v17h17 M7 14l4-5 4 3 6-7',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    plan: 'M8 4h12v16H4V8 M8 2v6H2 M8 12h8 M8 16h5',
    compare: 'M4 5h16 M4 12h10 M4 19h16 M17 9l3 3-3 3',
    data: 'M3 4h18v16H3z M3 10h18 M9 4v16',
    chevron: 'm8 10 4 4 4-4', plus: 'M12 5v14 M5 12h14',
    arrow: 'M5 12h14 m-6-6 6 6-6 6', download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
    upload: 'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',
    check: 'm5 12 4 4L19 6', close: 'm6 6 12 12 M6 18 18 6',
    more: 'M5 11v2 M12 11v2 M19 11v2', play: 'm8 5 11 7-11 7z',
    copy: 'M9 9h12v12H9z M15 9V3H3v12h6', trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    info: 'M12 11v6 M12 7v.1 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    alert: 'm12 3 10 18H2z M12 9v5 M12 17v.1',
    refresh: 'M20 7a9 9 0 1 0 1 9 M20 2v6h-6',
    save: 'M4 3h13l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8',
    folder: 'M3 6h7l2 2h9v12H3z', back: 'M19 12H5 m6-6-6 6 6 6',
    search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
};
function Icon({ name, size = 18, style }) {
    return __React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: style },
        __React.createElement("path", { d: paths[name] }));
}
function Brand() { return __React.createElement("svg", { width: "29", height: "29", viewBox: "0 0 40 40", fill: "none", "aria-hidden": "true" },
    __React.createElement("path", { d: "M9 8v24 M30 8 17 20l13 12", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }),
    __React.createElement("circle", { cx: "30", cy: "8", r: "3", fill: "currentColor", stroke: "var(--sidebar)", strokeWidth: "1.5" })); }

},
"src/components/Ui.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
exports.Spinner = Spinner;
exports.Empty = Empty;
exports.Modal = Modal;
exports.Notice = Notice;
exports.NumericInput = NumericInput;
const react_1 = require("react");
const Icon_1 = require("./Icon");
function Button({ children, kind = 'secondary', ...props }) {
    return __React.createElement("button", { type: "button", ...props, className: `button ${kind} ${props.className || ''}` }, children);
}
function Spinner() { return __React.createElement("span", { className: "spinner", "aria-hidden": "true" }); }
function Empty({ title, children, action }) {
    return __React.createElement("div", { className: "empty" },
        __React.createElement("div", { className: "empty-mark" },
            __React.createElement(Icon_1.Icon, { name: "plan", size: 28 })),
        __React.createElement("h2", null, title),
        __React.createElement("p", null, children),
        action);
}
function Modal({ title, children, onClose, wide = false }) {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => { const el = ref.current; el.showModal(); return () => el.close(); }, []);
    return __React.createElement("dialog", { ref: ref, className: `modal ${wide ? 'wide' : ''}`, "aria-label": title, onCancel: onClose, onClick: e => { if (e.target === e.currentTarget)
            onClose(); } },
        __React.createElement("div", { className: "modal-inner" },
            __React.createElement("div", { className: "modal-heading" },
                __React.createElement("h2", null, title),
                __React.createElement("button", { type: "button", className: "icon-button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u043A\u043D\u043E", onClick: onClose },
                    __React.createElement(Icon_1.Icon, { name: "close" }))),
            children));
}
function Notice({ children, tone = 'neutral' }) {
    return __React.createElement("div", { className: `notice ${tone}`, role: tone === 'error' ? 'alert' : undefined },
        __React.createElement(Icon_1.Icon, { name: tone === 'neutral' ? 'info' : 'alert', size: 17 }),
        __React.createElement("div", null, children));
}
function NumericInput({ value, onChange, label, integer = false }) {
    const valid = Number.isFinite(value) && value >= (integer ? 1 : 0) && (!integer || Number.isInteger(value));
    return __React.createElement("span", { className: "numeric-field" },
        __React.createElement("input", { "aria-label": label, type: "number", inputMode: integer ? 'numeric' : 'decimal', autoComplete: "off", min: integer ? 1 : 0, step: integer ? 1 : 'any', required: true, value: Number.isFinite(value) ? value : '', onChange: e => onChange(e.currentTarget.value === '' ? NaN : e.currentTarget.valueAsNumber), "aria-invalid": !valid }),
        !valid && __React.createElement("span", { className: "field-error" }, integer ? 'Укажите целый год' : 'Число ≥ 0'));
}

},
"src/components/useMotion.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMotionNumbers = useMotionNumbers;
const react_1 = require("react");
const motion_1 = require("../lib/motion");
const DURATION_MS = 120;
function sameNumbers(left, right) {
    return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}
function numberToken(value) {
    if (Number.isNaN(value))
        return 'nan';
    if (value === Infinity)
        return 'inf';
    if (value === -Infinity)
        return '-inf';
    if (Object.is(value, -0))
        return '-0';
    return String(value);
}
function useReducedMotion() {
    const [reduced, setReduced] = (0, react_1.useState)(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false);
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
            return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return reduced;
}
/** Smooths geometry only. Change key whenever the represented topology changes. */
function useMotionNumbers(target, key = '') {
    const reduced = useReducedMotion();
    const topology = `${key}\u0000${target.length}`;
    const signature = target.map(numberToken).join('\u0001');
    const [drawn, setDrawn] = (0, react_1.useState)(() => target.slice());
    const current = (0, react_1.useRef)(drawn);
    const currentTopology = (0, react_1.useRef)(topology);
    const compatible = currentTopology.current === topology && current.current.length === target.length;
    (0, react_1.useLayoutEffect)(() => {
        const destination = target.slice();
        if (reduced || currentTopology.current !== topology || current.current.length !== destination.length) {
            currentTopology.current = topology;
            current.current = destination;
            setDrawn(destination);
            return;
        }
        if (sameNumbers(current.current, destination))
            return;
        const origin = current.current.slice();
        let startedAt = null;
        return motion_1.sharedMotionScheduler.subscribe(timestamp => {
            if (startedAt === null)
                startedAt = timestamp;
            const progress = Math.min(1, (timestamp - startedAt) / DURATION_MS);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = destination.map((value, index) => origin[index] + (value - origin[index]) * eased);
            current.current = next;
            setDrawn(next);
            return progress < 1;
        });
    }, [reduced, signature, topology]);
    return reduced || !compatible ? target : drawn;
}

},
"src/features/Compare.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Compare = Compare;
const react_1 = require("react");
const client_1 = require("../api/client");
const Ui_1 = require("../components/Ui");
const Icon_1 = require("../components/Icon");
const Chart_1 = require("../components/Chart");
const format_1 = require("../lib/format");
const comparison_1 = require("../lib/comparison");
const colors = ['#a9c9ff', '#83c9b2', '#d9b990', '#baabe0', '#d49fa9', '#9fbabd'];
function Compare({ w }) {
    const [selected, setSelected] = (0, react_1.useState)([]);
    const [comparison, setComparison] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => { setComparison(null); }, [w.projects]);
    const ready = w.projects.filter(p => p.result_state === 'current');
    const years = [...new Set(comparison?.items.flatMap(i => (i.run.result.yearly_balance || []).map(b => b.year)) || [])].sort((a, b) => a - b);
    const warnings = comparison ? (0, comparison_1.comparabilityWarnings)(comparison) : [];
    const sameUnits = !warnings.some(s => s.startsWith('Единицы'));
    const supported = comparison?.items.every(i => (0, format_1.supportedUnits)(i.run.result.units)) ?? false;
    function toggle(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 6 ? [...s, id] : s); setComparison(null); }
    return __React.createElement("section", { className: "page-enter" },
        __React.createElement("div", { className: "page-intro" },
            __React.createElement("div", null,
                __React.createElement("h1", null, "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u043B\u0430\u043D\u043E\u0432"),
                __React.createElement("p", null, "\u0421\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0440\u0430\u0441\u0447\u0451\u0442\u044B. \u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0437\u0430 \u0432\u0430\u043C\u0438."))),
        __React.createElement("div", { className: "comparison-picker" },
            __React.createElement("div", { className: "section-heading" },
                __React.createElement("h2", null, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0442 2 \u0434\u043E 6 \u043F\u043B\u0430\u043D\u043E\u0432"),
                __React.createElement(Ui_1.Button, { kind: "ghost", disabled: !!w.busy, onClick: () => void w.execute('Обновляем…', w.refreshList) },
                    __React.createElement(Icon_1.Icon, { name: "refresh" }),
                    "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C")),
            !w.projects.length ? __React.createElement("p", { className: "empty-cell" }, "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u0434\u0432\u0430 \u043F\u043B\u0430\u043D\u0430.") : __React.createElement("div", { className: "project-list" }, w.projects.map(p => __React.createElement("label", { className: `project-option ${p.result_state !== 'current' ? 'unavailable' : ''}`, key: p.project_id },
                __React.createElement("input", { type: "checkbox", checked: selected.includes(p.project_id), disabled: !!w.busy || p.result_state !== 'current' || (selected.length >= 6 && !selected.includes(p.project_id)), onChange: () => toggle(p.project_id) }),
                __React.createElement("span", null,
                    __React.createElement("strong", null, p.name),
                    __React.createElement("small", null,
                        (0, format_1.scenario)(p.scenario_id),
                        " \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439")),
                __React.createElement("small", null, p.result_state === 'current' ? (0, format_1.date)(p.updated_at) : p.result_state === 'stale' ? 'Нужен пересчёт' : 'Не рассчитан')))),
            ready.length < 2 && __React.createElement("p", { className: "help" }, "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u043F\u0438\u044E \u043F\u043B\u0430\u043D\u0430 \u0447\u0435\u0440\u0435\u0437 \u043C\u0435\u043D\u044E \u0441\u0432\u0435\u0440\u0445\u0443, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0435\u0451."),
            __React.createElement("div", { className: "section-footer" },
                __React.createElement("span", { className: "help" }, selected.length ? `Выбрано: ${selected.length}` : 'Исходные планы не изменяются.'),
                __React.createElement(Ui_1.Button, { kind: "primary", disabled: selected.length < 2 || !!w.busy, onClick: () => void w.execute('Сравниваем…', async () => { setComparison(await client_1.api.compare(selected)); }) },
                    "\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C",
                    __React.createElement(Icon_1.Icon, { name: "arrow" })))),
        comparison && __React.createElement("div", { className: "comparison-result page-enter" },
            __React.createElement("div", { className: "section-heading" },
                __React.createElement("h2", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F"),
                __React.createElement("div", { className: "inline-actions" },
                    __React.createElement(Ui_1.Button, { kind: "ghost", onClick: () => (0, format_1.jsonDownload)(comparison, 'comparison.json') },
                        __React.createElement(Icon_1.Icon, { name: "download" }),
                        "JSON"),
                    __React.createElement(Ui_1.Button, { kind: "ghost", onClick: () => (0, format_1.downloadBlob)(new Blob([(0, comparison_1.comparisonCsv)(comparison)], { type: 'text/csv;charset=utf-8' }), 'comparison.csv') }, "CSV"))),
            warnings.map(s => __React.createElement(Ui_1.Notice, { key: s, tone: "warning" }, s)),
            sameUnits && supported && __React.createElement(Chart_1.Chart, { years: years, unit: "\u043C\u043B\u043D \u0443.\u0435.", series: comparison.items.map((item, i) => ({ key: item.project_id, label: item.name, values: years.map(y => item.run.result.financial_breakdown?.find(f => f.year === y)?.total), color: colors[i] })) }),
            !supported && __React.createElement(Ui_1.Notice, { tone: "warning" }, "\u0415\u0434\u0438\u043D\u0438\u0446\u044B \u043C\u043E\u0434\u0435\u043B\u0438 \u043E\u0442\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F \u043E\u0442 \u0442 / \u043C\u043B\u043D \u0443.\u0435. \u0427\u0438\u0441\u043B\u043E\u0432\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0441\u043A\u0440\u044B\u0442\u0430. \u0412 JSON \u0438 CSV \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0441 \u0435\u0434\u0438\u043D\u0438\u0446\u0430\u043C\u0438."),
            supported && __React.createElement("div", { className: "table-wrap" },
                __React.createElement("table", { className: "comparison-table" },
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C"),
                            comparison.items.map(i => __React.createElement("th", { key: i.project_id },
                                i.name,
                                __React.createElement("small", null, (0, format_1.scenario)(i.run.result.scenario_id)))))),
                    __React.createElement("tbody", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u0420\u0430\u0441\u0445\u043E\u0434\u044B \u0437\u0430 \u0432\u0435\u0441\u044C \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442, \u043C\u043B\u043D \u0443.\u0435."),
                            comparison.items.map(i => __React.createElement("td", { key: i.project_id, className: "numeric" }, (0, format_1.number)(i.run.result.total_cost_mln)))),
                        years.map(y => __React.createElement("tr", { key: `total-${y}` },
                            __React.createElement("th", null,
                                "\u041E\u0431\u0449\u0438\u0439 \u0441\u043F\u0440\u043E\u0441 \u00B7 ",
                                y),
                            comparison.items.map(i => __React.createElement("td", { key: i.project_id, className: "numeric" }, (0, format_1.percent)(i.run.result.yearly_balance?.find(b => b.year === y)?.service_level_total))))),
                        years.map(y => __React.createElement("tr", { key: `critical-${y}` },
                            __React.createElement("th", null,
                                "\u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u043F\u0440\u043E\u0441 \u00B7 ",
                                y),
                            comparison.items.map(i => __React.createElement("td", { key: i.project_id, className: "numeric" }, (0, format_1.percent)(i.run.result.yearly_balance?.find(b => b.year === y)?.service_level_critical))))),
                        years.map(y => __React.createElement("tr", { key: `short-${y}` },
                            __React.createElement("th", null,
                                "\u0414\u0435\u0444\u0438\u0446\u0438\u0442, \u0442 \u00B7 ",
                                y),
                            comparison.items.map(i => __React.createElement("td", { key: i.project_id, className: "numeric" }, (0, format_1.number)(i.run.result.yearly_balance?.find(b => b.year === y)?.shortage_t))))),
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439 \u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u0438"),
                            comparison.items.map(i => __React.createElement("td", { key: i.project_id, className: "numeric" }, i.run.result.constraint_checks?.filter(c => !c.passed).length ?? '—')))))),
            __React.createElement("p", { className: "help" }, "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0441\u043D\u0438\u043C\u043A\u0438, \u0431\u0435\u0437 \u0440\u0430\u043D\u0436\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u0432\u044B\u0431\u043E\u0440\u0430 \u00AB\u043B\u0443\u0447\u0448\u0435\u0433\u043E\u00BB \u043F\u043B\u0430\u043D\u0430. \u041F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u043F\u043B\u0430\u043D\u043E\u0432 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435."),
            __React.createElement("details", { className: "disclosure" },
                __React.createElement("summary", null,
                    "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u0438 \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
                    __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
                __React.createElement("div", { className: "disclosure-body" },
                    comparison.items.map(i => __React.createElement("details", { className: "sub-details", key: i.project_id },
                        __React.createElement("summary", null,
                            i.name,
                            " \u2014 \u0432\u0445\u043E\u0434\u043D\u043E\u0439 \u043F\u043B\u0430\u043D"),
                        __React.createElement("p", { className: "help" },
                            "\u0420\u0435\u0432\u0438\u0437\u0438\u044F ",
                            i.run.input_revision,
                            " \u00B7 ",
                            (0, format_1.date)(i.run.created_at),
                            " \u00B7 ",
                            i.run.engine.engine_id),
                        __React.createElement("pre", null, JSON.stringify(i.run.plan_snapshot, null, 2)))),
                    comparison.warnings.map(s => __React.createElement("p", { className: "help", key: s }, s))))));
}

},
"src/features/DataCatalog.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCatalog = DataCatalog;
const react_1 = require("react");
const Ui_1 = require("../components/Ui");
const Icon_1 = require("../components/Icon");
const format_1 = require("../lib/format");
const catalog_1 = require("../lib/catalog");
function DataCatalog({ w, onImport }) {
    const [tableId, setTableId] = (0, react_1.useState)('demand');
    const [showAll, setShowAll] = (0, react_1.useState)(false);
    const table = w.catalog?.tables.find(t => t.table_id === tableId);
    const cols = table?.columns.filter(c => showAll || !['status', 'notes', 'description', 'reliability_profile'].includes(c)) || [];
    return __React.createElement("section", { className: "page-enter" },
        __React.createElement("div", { className: "page-intro" },
            __React.createElement("div", null,
                __React.createElement("h1", null, "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435"),
                __React.createElement("p", null, "\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0438 \u043A\u0435\u0439\u0441\u0430 \u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u043F\u043B\u0430\u043D\u043E\u0432.")),
            __React.createElement(Ui_1.Button, { onClick: onImport, disabled: !!w.busy },
                __React.createElement(Icon_1.Icon, { name: "upload" }),
                "\u0418\u043C\u043F\u043E\u0440\u0442 JSON")),
        __React.createElement(Ui_1.Notice, null, "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430. \u0417\u0434\u0435\u0441\u044C \u043E\u043D \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F: \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 CSV/XLSX."),
        __React.createElement("div", { className: "section-heading catalog-heading" },
            __React.createElement("label", { className: "field" },
                "\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A",
                __React.createElement("select", { "aria-label": "\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A", value: tableId, onChange: e => setTableId(e.target.value) }, w.catalog?.tables.map(t => __React.createElement("option", { key: t.table_id, value: t.table_id }, catalog_1.tableLabels[t.table_id] || t.table_id)))),
            __React.createElement(Ui_1.Button, { kind: "ghost", disabled: !table, onClick: () => { if (table) {
                    const csv = [table.columns, ...table.rows.map(row => table.columns.map(c => row[c]))].map(r => r.map(format_1.csvCell).join(',')).join('\r\n');
                    (0, format_1.downloadBlob)(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), table.table_id + '.csv');
                } } },
                __React.createElement(Icon_1.Icon, { name: "download" }),
                "\u0421\u043A\u0430\u0447\u0430\u0442\u044C CSV")),
        __React.createElement("div", { className: "table-wrap catalog-table" },
            __React.createElement("table", null,
                __React.createElement("caption", { className: "sr-only" }, catalog_1.tableLabels[tableId]),
                __React.createElement("thead", null,
                    __React.createElement("tr", null, cols.map(c => __React.createElement("th", { key: c }, catalog_1.columnLabels[c] || c)))),
                __React.createElement("tbody", null, table?.rows.map((row, i) => __React.createElement("tr", { key: i }, cols.map(c => __React.createElement("td", { key: c }, row[c] || '—'))))))),
        __React.createElement("div", { className: "section-footer" },
            __React.createElement("p", { className: "help" },
                table?.rows.length || 0,
                " \u0441\u0442\u0440\u043E\u043A. \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u044B API \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430."),
            __React.createElement("label", { className: "checkbox-label" },
                __React.createElement("input", { type: "checkbox", checked: showAll, onChange: e => setShowAll(e.target.checked) }),
                "\u0412\u0441\u0435 \u043F\u043E\u043B\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u0438\u043A\u0430")),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("p", null,
                    __React.createElement("code", null, table?.source_path)),
                __React.createElement("p", { className: "help break-word" },
                    "SHA-256: ",
                    table?.sha256),
                w.catalog?.notes.map(n => __React.createElement("p", { key: n, className: "help" }, n)))),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("pre", null, JSON.stringify(w.catalog?.scenarios, null, 2)))));
}

},
"src/features/Infrastructure.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Infrastructure = Infrastructure;
const Icon_1 = require("../components/Icon");
const Controls_1 = require("../components/Controls");
const matrix_1 = require("../lib/matrix");
const format_1 = require("../lib/format");
const storageInvestment = { id: 'ZBO', defaultYear: 2036 };
function Infrastructure({ w, onAdvanced, onData }) {
    if (!w.draft)
        return null;
    const plan = w.draft, inventory = plan.decisions.inventory_policy.initial_inventory_t;
    const investments = w.catalog?.tables.find(t => t.table_id === 'investment_options')?.rows || [];
    const storage = w.catalog?.tables.find(t => t.table_id === 'storage_options')?.rows || [];
    const cap = Number(storage[0]?.capacity_t) || 70;
    const records = plan.decisions.investments.filter(r => r.investment_id === storageInvestment.id);
    const row = records[0];
    const reference = investments.find(r => r.investment_id === storageInvestment.id);
    const years = [...new Set([...(0, matrix_1.matrixYears)(plan, w.catalog), storageInvestment.defaultYear, ...records.map(r => r.year)])].sort((a, b) => a - b);
    const changeInventory = (v) => w.setDraft({ ...plan, decisions: { ...plan.decisions, inventory_policy: { ...plan.decisions.inventory_policy, initial_inventory_t: v } } });
    return __React.createElement("aside", { className: "infrastructure panel", "aria-label": "\u0418\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430" },
        __React.createElement("div", { className: "panel-heading" },
            __React.createElement("h2", null, "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435"),
            __React.createElement("button", { type: "button", className: "icon-button", title: "\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0438 \u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B", "aria-label": "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435", onClick: onData },
                __React.createElement(Icon_1.Icon, { name: "info", size: 16 }))),
        __React.createElement("fieldset", { disabled: !!w.busy, className: "storage-controls" },
            __React.createElement("div", { className: "inventory-control" },
                __React.createElement("label", null,
                    "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441 ",
                    __React.createElement("span", null, "\u0442")),
                __React.createElement("div", null,
                    __React.createElement(Controls_1.StepNumber, { value: inventory, label: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441, \u0442", onChange: changeInventory, step: 1 })),
                __React.createElement(Controls_1.Range, { value: inventory, max: cap, label: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441", onChange: changeInventory, step: .01 }),
                __React.createElement("div", { className: "range-scale" },
                    __React.createElement("span", null, "0"),
                    __React.createElement("span", null,
                        (0, format_1.number)(cap),
                        " \u0442")),
                (!Number.isFinite(inventory) || inventory < 0) && __React.createElement("p", { className: "field-error" }, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0430\u0441 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u043D\u0443\u043B\u044F.")),
            __React.createElement("div", { className: `storage-investment ${row ? 'enabled' : ''}` },
                __React.createElement("div", { className: "storage-investment-name" },
                    __React.createElement(Icon_1.Icon, { name: "box", size: 17 }),
                    __React.createElement("strong", null, "ZBO")),
                records.length > 1 ? __React.createElement("button", { type: "button", className: "text-button", onClick: onAdvanced },
                    records.length,
                    " \u0437\u0430\u043F\u0438\u0441\u0438") : __React.createElement(Controls_1.Toggle, { label: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C ZBO", checked: !!row, onChange: yes => w.setDraft((0, matrix_1.setInvestment)(plan, storageInvestment.id, yes ? storageInvestment.defaultYear : null)) }),
                __React.createElement("select", { title: reference?.commissioning_rule, "aria-label": "\u0413\u043E\u0434 ZBO", disabled: !row || records.length > 1, value: row?.year || storageInvestment.defaultYear, onChange: e => w.setDraft((0, matrix_1.setInvestment)(plan, storageInvestment.id, Number(e.target.value))) }, years.map(y => __React.createElement("option", { key: y }, y))),
                __React.createElement("span", { className: "storage-capex" },
                    "CAPEX ",
                    __React.createElement("strong", null, reference ? (0, format_1.number)(Number(reference.total_capex_mln)) : '—'),
                    " \u043C\u043B\u043D"))));
}

},
"src/features/Overview.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Overview = Overview;
const react_1 = require("react");
const Ui_1 = require("../components/Ui");
const Icon_1 = require("../components/Icon");
const Chart_1 = require("../components/Chart");
const format_1 = require("../lib/format");
const label = { BASE_CRITICAL_SERVICE: 'Критический спрос', BASE_TOTAL_SERVICE: 'Общий спрос', RESERVE_45D: 'Резерв на 45 дней', STRESS_LOSS_LIMIT: 'Потери в стрессе', CAPEX_2037: 'CAPEX до 2037', CAPEX_2040: 'CAPEX до 2040', EMERGENCY_BASE_STREAK: 'Использование Emergency' };
const numericRows = [['demand_total_t', 'Общий спрос, т'], ['demand_critical_t', 'Критический спрос, т'], ['delivered_t', 'Фактическая поставка, т'], ['served_t', 'Обслуженный спрос, т'], ['shortage_t', 'Дефицит, т'], ['losses_t', 'Потери, т'], ['opening_inventory_t', 'Начальный запас, т'], ['closing_inventory_t', 'Конечный запас, т'], ['reserve_45d_target_t', 'Целевой резерв, т'], ['service_level_total', 'Обслуживание общего спроса', true], ['service_level_critical', 'Обслуживание критического спроса', true]];
function Overview({ w }) {
    const [year, setYear] = (0, react_1.useState)(null);
    const [chart, setChart] = (0, react_1.useState)('supply');
    if (!w.current || !w.project?.last_run) {
        const stale = w.project?.last_run;
        return __React.createElement("section", { className: "page-enter" },
            __React.createElement("div", { className: "page-intro" },
                __React.createElement("div", null,
                    __React.createElement("h1", null, "\u041E\u0431\u0437\u043E\u0440 \u043F\u043B\u0430\u043D\u0430"),
                    __React.createElement("p", null, "\u041F\u043E\u0441\u0442\u0430\u0432\u043A\u0438, \u0441\u043F\u0440\u043E\u0441 \u0438 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043D\u0430 \u043E\u0434\u043D\u043E\u043C \u044D\u043A\u0440\u0430\u043D\u0435."))),
            __React.createElement(Ui_1.Empty, { title: stale ? 'План изменился' : 'Результатов пока нет', action: __React.createElement(Ui_1.Button, { kind: "primary", disabled: !!w.busy || !w.draft, onClick: () => void w.calculate() },
                    __React.createElement(Icon_1.Icon, { name: "play" }),
                    "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043F\u043B\u0430\u043D") }, stale ? 'Пересчитайте план, чтобы увидеть актуальные значения. Старые результаты не подставляются вместо новых.' : 'Проверьте решения на вкладке «План» и запустите расчёт. Здесь появится ответ вашей модели.'));
    }
    const run = w.project.last_run, result = run.result;
    if (!(0, format_1.supportedUnits)(result.units))
        return __React.createElement("section", null,
            __React.createElement("h1", null, "\u041E\u0431\u0437\u043E\u0440 \u043F\u043B\u0430\u043D\u0430"),
            __React.createElement(Ui_1.Notice, { tone: "warning" },
                "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u0434\u0440\u0443\u0433\u0438\u0435 \u0435\u0434\u0438\u043D\u0438\u0446\u044B \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u044F: ",
                JSON.stringify(result.units),
                ". \u042D\u0442\u043E\u0442 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043F\u043E\u0434\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0442\u043E\u043D\u043D\u044B \u0438 \u043C\u043B\u043D \u0443.\u0435. \u2014 \u0447\u0438\u0441\u043B\u043E\u0432\u044B\u0435 \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u0441\u043A\u0440\u044B\u0442\u044B, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C \u0441\u043C\u044B\u0441\u043B \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430. \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 JSON \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432 \u043C\u0435\u043D\u044E \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438."));
    const balances = result.yearly_balance || [];
    const years = balances.map(b => b.year);
    const selected = balances.find(b => b.year === year) || balances[0];
    const financial = (result.financial_breakdown || []).find(f => f.year === selected?.year);
    const checks = result.constraint_checks || [];
    const failed = checks.filter(c => !c.passed);
    const series = chart === 'supply' ? [
        { key: 'demand', label: 'Общий спрос', values: balances.map(b => b.demand_total_t), color: '#b3bdcc', dashed: true },
        { key: 'delivered', label: 'Поставлено', values: balances.map(b => b.delivered_t), color: '#a9c9ff' },
        { key: 'served', label: 'Обслужено', values: balances.map(b => b.served_t), color: '#83c9b2' },
    ] : chart === 'inventory' ? [
        { key: 'opening', label: 'Запас на начало', values: balances.map(b => b.opening_inventory_t), color: '#a9c9ff' },
        { key: 'closing', label: 'Запас на конец', values: balances.map(b => b.closing_inventory_t), color: '#83c9b2' },
        { key: 'target', label: 'Целевой резерв', values: balances.map(b => b.reserve_45d_target_t), color: '#b3bdcc', dashed: true },
    ] : [{ key: 'cost', label: 'Годовые расходы', values: years.map(y => result.financial_breakdown?.find(f => f.year === y)?.total), color: '#a9c9ff' }];
    return __React.createElement("section", { className: "page-enter", "aria-labelledby": "overview-title" },
        __React.createElement("div", { className: "page-intro" },
            __React.createElement("div", null,
                __React.createElement("h1", { id: "overview-title" }, "\u041E\u0431\u0437\u043E\u0440 \u043F\u043B\u0430\u043D\u0430"),
                __React.createElement("p", null,
                    (0, format_1.scenario)(result.scenario_id),
                    " \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 ",
                    __React.createElement("span", { className: "text-separator" }, "/"),
                    " ",
                    years.length ? `${years[0]}–${years.at(-1)}` : 'Годы не переданы')),
            __React.createElement("label", { className: "year-control" },
                "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u0437\u0430",
                __React.createElement("select", { "aria-label": "\u0413\u043E\u0434 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0435\u0439", value: selected?.year || '', onChange: e => setYear(Number(e.target.value)) }, years.map(y => __React.createElement("option", { key: y }, y))))),
        run.origin === 'imported' && __React.createElement(Ui_1.Notice, { tone: "warning" }, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D \u0438\u0437 \u0444\u0430\u0439\u043B\u0430 \u0438 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435."),
        __React.createElement("div", { className: "metric-strip" },
            __React.createElement("div", null,
                __React.createElement("span", null, "\u041E\u0431\u0449\u0438\u0439 \u0441\u043F\u0440\u043E\u0441"),
                __React.createElement("strong", null, (0, format_1.percent)(selected?.service_level_total)),
                __React.createElement("small", null,
                    "\u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u0437\u0430 ",
                    selected?.year || '—')),
            __React.createElement("div", null,
                __React.createElement("span", null, "\u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u043F\u0440\u043E\u0441"),
                __React.createElement("strong", null, (0, format_1.percent)(selected?.service_level_critical)),
                __React.createElement("small", null, "\u043F\u043E\u043A\u0430\u0437\u0430\u043D \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u043E\u0442 \u043E\u0431\u0449\u0435\u0433\u043E")),
            __React.createElement("div", null,
                __React.createElement("span", null, "\u0413\u043E\u0434\u043E\u0432\u044B\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B"),
                __React.createElement("strong", null,
                    (0, format_1.number)(financial?.total),
                    __React.createElement("em", null, "\u043C\u043B\u043D \u0443.\u0435.")),
                __React.createElement("small", null,
                    "\u0437\u0430 \u0432\u0435\u0441\u044C \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442: ",
                    (0, format_1.number)(result.total_cost_mln),
                    " \u043C\u043B\u043D \u0443.\u0435."))),
        __React.createElement("div", { className: "chart-section" },
            __React.createElement("div", { className: "section-heading" },
                __React.createElement("h2", null, chart === 'supply' ? 'Спрос и поставки' : chart === 'inventory' ? 'Запасы и резерв' : 'Расходы по годам'),
                __React.createElement("div", { className: "segmented compact", "aria-label": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C \u0433\u0440\u0430\u0444\u0438\u043A\u0430" }, [['supply', 'Поставки'], ['inventory', 'Запасы'], ['cost', 'Расходы']].map(([k, v]) => __React.createElement("button", { type: "button", key: k, "aria-pressed": chart === k, onClick: () => setChart(k) }, v)))),
            __React.createElement(Chart_1.Chart, { years: years, series: series, unit: chart === 'cost' ? 'млн у.е.' : 'т' })),
        __React.createElement("div", { className: "checks-block" },
            __React.createElement("div", { className: "section-heading" },
                __React.createElement("h2", null, "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F"),
                __React.createElement("span", { className: failed.length ? 'warning-text' : 'muted' }, !checks.length ? 'Модель не передала проверки' : failed.length ? `${failed.length} нарушений в ответе модели` : 'Нет нарушений в переданных проверках')),
            failed.length > 0 ? __React.createElement("div", { className: "table-wrap" },
                __React.createElement("table", { className: "checks-table" },
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u0413\u043E\u0434"),
                            __React.createElement("th", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430"),
                            __React.createElement("th", null, "\u041F\u0440\u0438\u0447\u0438\u043D\u0430"),
                            __React.createElement("th", { className: "numeric" }, "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u0435*"))),
                    __React.createElement("tbody", null, failed.map((c, i) => __React.createElement("tr", { key: i },
                        __React.createElement("td", null,
                            __React.createElement("span", { className: "year-warning" },
                                __React.createElement(Icon_1.Icon, { name: "alert", size: 14 }),
                                c.year)),
                        __React.createElement("td", null, label[c.constraint_id] || c.constraint_id),
                        __React.createElement("td", null, c.detail),
                        __React.createElement("td", { className: "numeric" }, (0, format_1.number)(c.excess)))))),
                __React.createElement("p", { className: "help" }, "* \u0427\u0438\u0441\u043B\u043E \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u043C\u043E\u0434\u0435\u043B\u044C\u044E. \u0415\u0434\u0438\u043D\u0438\u0446\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0430 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u043C DTO; \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.")) : __React.createElement("p", { className: "help" }, checks.length ? 'Этот вывод относится только к проверкам текущего прототипа, не к полной приёмке модели.' : 'Отсутствие проверок не подтверждает исполнимость плана.')),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u0411\u0430\u043B\u0430\u043D\u0441 \u043F\u043E \u0433\u043E\u0434\u0430\u043C",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("div", { className: "table-wrap" },
                    __React.createElement("table", { className: "matrix" },
                        __React.createElement("thead", null,
                            __React.createElement("tr", null,
                                __React.createElement("th", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C"),
                                years.map(y => __React.createElement("th", { key: y, className: "numeric" }, y)))),
                        __React.createElement("tbody", null,
                            numericRows.map(([key, title, pct]) => __React.createElement("tr", { key: key },
                                __React.createElement("th", { scope: "row" }, title),
                                balances.map(b => __React.createElement("td", { key: b.year, className: "numeric" }, pct ? (0, format_1.percent)(b[key]) : (0, format_1.number)(b[key]))))),
                            __React.createElement("tr", null,
                                __React.createElement("th", { scope: "row" }, "\u0420\u0435\u0437\u0435\u0440\u0432 \u043F\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0438"),
                                balances.map(b => __React.createElement("td", { key: b.year }, b.reserve_45d_met ? 'Выполнен' : 'Не выполнен')))))))),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("div", { className: "table-wrap" },
                    __React.createElement("table", null,
                        __React.createElement("thead", null,
                            __React.createElement("tr", null,
                                __React.createElement("th", null, "\u0413\u043E\u0434"),
                                __React.createElement("th", null, "\u0417\u0430\u043A\u0443\u043F\u043A\u0430"),
                                __React.createElement("th", null, "\u0420\u0435\u0437\u0435\u0440\u0432"),
                                __React.createElement("th", null, "\u0425\u0440\u0430\u043D\u0435\u043D\u0438\u0435"),
                                __React.createElement("th", null, "CAPEX"),
                                __React.createElement("th", null, "OPEX"),
                                __React.createElement("th", null, "\u0412\u0441\u0435\u0433\u043E"))),
                        __React.createElement("tbody", null, (result.financial_breakdown || []).map(f => __React.createElement("tr", { key: f.year },
                            __React.createElement("th", { scope: "row" }, f.year),
                            ['procurement', 'reservation', 'holding', 'capex', 'opex', 'total'].map(k => __React.createElement("td", { key: k, className: "numeric" }, (0, format_1.number)(f[k])))))))),
                __React.createElement("p", { className: "help" }, "\u041C\u043B\u043D \u0443\u0441\u043B\u043E\u0432\u043D\u044B\u0445 \u0434\u0435\u043D\u0435\u0436\u043D\u044B\u0445 \u0435\u0434\u0438\u043D\u0438\u0446. \u042D\u0442\u043E \u0440\u0430\u0441\u0445\u043E\u0434\u044B, \u043D\u0435 \u043F\u0440\u0438\u0431\u044B\u043B\u044C. \u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0438\u0441\u043A\u043E\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B \u0438 \u0441\u0442\u0430\u0432\u043A\u0430 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u043C DTO \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F."))),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u041F\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u043F\u043E \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("div", { className: "table-wrap" },
                    __React.createElement("table", null,
                        __React.createElement("thead", null,
                            __React.createElement("tr", null,
                                __React.createElement("th", null, "\u0413\u043E\u0434"),
                                __React.createElement("th", null, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A"),
                                __React.createElement("th", null, "\u0420\u0435\u0437\u0435\u0440\u0432, \u0442/\u0433\u043E\u0434"),
                                __React.createElement("th", null, "\u0417\u0430\u043A\u0430\u0437, \u0442"),
                                __React.createElement("th", null, "\u041F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E, \u0442"))),
                        __React.createElement("tbody", null, (result.source_schedule || []).map((s, i) => __React.createElement("tr", { key: i },
                            __React.createElement("td", null, s.year),
                            __React.createElement("td", null, s.source_id),
                            __React.createElement("td", { className: "numeric" }, (0, format_1.number)(s.reserved_capacity_t)),
                            __React.createElement("td", { className: "numeric" }, (0, format_1.number)(s.ordered_t)),
                            __React.createElement("td", { className: "numeric" }, (0, format_1.number)(s.delivered_t))))))))),
        __React.createElement("details", { className: "disclosure" },
            __React.createElement("summary", null,
                "\u041F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435",
                __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
            __React.createElement("div", { className: "disclosure-body" },
                __React.createElement("p", null,
                    "\u0420\u0430\u0441\u0447\u0451\u0442: ",
                    (0, format_1.date)(run.created_at),
                    ". \u0420\u0435\u0432\u0438\u0437\u0438\u044F \u0432\u0445\u043E\u0434\u043E\u0432: ",
                    run.input_revision,
                    ". \u041C\u043E\u0434\u0443\u043B\u044C: ",
                    __React.createElement("code", null, run.engine.engine_id),
                    "."),
                __React.createElement("p", { className: "help" },
                    "\u0414\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u044B \u043C\u043E\u0434\u0435\u043B\u044C\u044E: ",
                    __React.createElement("code", null, typeof result.assumptions_reference === 'string' ? result.assumptions_reference : JSON.stringify(result.assumptions_reference)),
                    ". \u042D\u0442\u043E \u0441\u0441\u044B\u043B\u043A\u0430 \u0438\u0437 \u043E\u0442\u0432\u0435\u0442\u0430, \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u0430\u043B\u0438\u0447\u0438\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430."),
                [['inventory_trace', 'Внутригодовые запасы'], ['risk_register', 'Реестр рисков']].map(([key, title]) => __React.createElement("div", { key: key },
                    __React.createElement("h3", null, title),
                    result[key]?.length ? __React.createElement("pre", null, JSON.stringify(result[key], null, 2)) : __React.createElement("p", { className: "help" }, "\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u044D\u0442\u0438 \u0434\u0430\u043D\u043D\u044B\u0435. \u0418\u0445 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0440\u0438\u0441\u043A\u0430 \u0438\u043B\u0438 \u0434\u0435\u0444\u0438\u0446\u0438\u0442\u0430."))),
                __React.createElement("details", { className: "sub-details" },
                    __React.createElement("summary", null, "\u0412\u0441\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043C\u043E\u0434\u0435\u043B\u0438"),
                    __React.createElement("pre", null, JSON.stringify(checks, null, 2))))));
}

},
"src/features/PlanEditor.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanEditor = PlanEditor;
const react_1 = require("react");
const plan_1 = require("../lib/plan");
const Ui_1 = require("../components/Ui");
const Icon_1 = require("../components/Icon");
const format_1 = require("../lib/format");
function PlanEditor({ w }) {
    const [mode, setMode] = (0, react_1.useState)('supply_orders');
    if (!w.draft)
        return null;
    const plan = w.draft;
    const years = (0, plan_1.planYears)(plan, w.catalog);
    const sources = (0, plan_1.sourceChoices)(plan, w.catalog);
    const investments = w.catalog?.tables.find(t => t.table_id === 'investment_options')?.rows || [];
    const rows = plan.decisions[mode];
    function add() { w.setDraft((0, plan_1.addDecision)(plan, mode, mode === 'supply_orders' ? { year: years[0] || 2035, source_id: sources[0] || '', order_t: 0 } : { year: years[0] || 2035, source_id: sources[0] || '', reserved_capacity_t: 0 })); }
    return __React.createElement("section", { className: "page-enter", "aria-labelledby": "plan-title" },
        __React.createElement("div", { className: "page-intro" },
            __React.createElement("div", null,
                __React.createElement("h1", { id: "plan-title" }, "\u041F\u043B\u0430\u043D \u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u044F"),
                __React.createElement("p", null, "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F. \u041F\u043E\u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0438\u044F \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u044C.")),
            __React.createElement("span", { className: "quiet-tag" }, years.length ? `${years[0]}–${years.at(-1)}` : 'Горизонт из данных')),
        __React.createElement("fieldset", { className: "editor-fieldset", disabled: !!w.busy },
            __React.createElement("div", { className: "plan-settings" },
                __React.createElement("label", { className: "field plan-name" },
                    "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u043B\u0430\u043D\u0430",
                    __React.createElement("input", { name: "plan-name", autoComplete: "off", value: w.name, maxLength: 140, required: true, onChange: e => w.setName(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043F\u043B\u0430\u043D\u2026" })),
                __React.createElement("label", { className: "field" },
                    "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439",
                    __React.createElement("select", { "aria-label": "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439", value: plan.scenario_id, onChange: e => w.setDraft({ ...plan, scenario_id: e.target.value }) },
                        __React.createElement("option", { value: "BASE" }, "\u0411\u0430\u0437\u043E\u0432\u044B\u0439"),
                        __React.createElement("option", { value: "MANDATORY_STRESS" }, "\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0440\u0435\u0441\u0441"),
                        !['BASE', 'MANDATORY_STRESS'].includes(plan.scenario_id) && __React.createElement("option", { value: plan.scenario_id }, plan.scenario_id))),
                __React.createElement("div", { className: "field" },
                    "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441, \u0442",
                    __React.createElement(Ui_1.NumericInput, { value: plan.decisions.inventory_policy.initial_inventory_t, label: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441, \u0442", onChange: v => w.setDraft({ ...plan, decisions: { ...plan.decisions, inventory_policy: { ...plan.decisions.inventory_policy, initial_inventory_t: v } } }) }))),
            __React.createElement("div", { className: "section-heading" },
                __React.createElement("div", { className: "segmented", "aria-label": "\u0422\u0438\u043F \u0440\u0435\u0448\u0435\u043D\u0438\u0439" },
                    __React.createElement("button", { type: "button", "aria-pressed": mode === 'supply_orders', onClick: () => setMode('supply_orders') }, "\u041F\u043E\u0441\u0442\u0430\u0432\u043A\u0438"),
                    __React.createElement("button", { type: "button", "aria-pressed": mode === 'capacity_reservations', onClick: () => setMode('capacity_reservations') }, "\u0420\u0435\u0437\u0435\u0440\u0432 \u043C\u043E\u0449\u043D\u043E\u0441\u0442\u0438")),
                __React.createElement(Ui_1.Button, { kind: "ghost", onClick: add },
                    __React.createElement(Icon_1.Icon, { name: "plus" }),
                    "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443")),
            __React.createElement("div", { className: "table-wrap editor-table" },
                __React.createElement("table", null,
                    __React.createElement("caption", { className: "sr-only" }, mode === 'supply_orders' ? 'План поставок' : 'План резервирования'),
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", { scope: "col" }, "\u0413\u043E\u0434"),
                            __React.createElement("th", { scope: "col" }, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A"),
                            __React.createElement("th", { scope: "col" }, mode === 'supply_orders' ? 'Объём заказа, т' : 'Мощность, т/год'),
                            __React.createElement("th", { scope: "col" },
                                __React.createElement("span", { className: "sr-only" }, "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435")))),
                    __React.createElement("tbody", null,
                        rows.map((row, i) => __React.createElement("tr", { key: `${mode}-${i}` },
                            __React.createElement("td", null,
                                __React.createElement(Ui_1.NumericInput, { integer: true, value: row.year, label: `Год, строка ${i + 1}`, onChange: v => w.setDraft((0, plan_1.updateDecision)(plan, mode, i, { year: v })) })),
                            __React.createElement("td", null,
                                __React.createElement("select", { "aria-label": `Источник, строка ${i + 1}`, value: row.source_id, onChange: e => w.setDraft((0, plan_1.updateDecision)(plan, mode, i, { source_id: e.target.value })) }, sources.map(s => __React.createElement("option", { key: s, value: s }, s)))),
                            __React.createElement("td", null,
                                __React.createElement(Ui_1.NumericInput, { label: `Объём, строка ${i + 1}`, value: mode === 'supply_orders' ? row.order_t : row.reserved_capacity_t, onChange: v => w.setDraft((0, plan_1.updateDecision)(plan, mode, i, mode === 'supply_orders' ? { order_t: v } : { reserved_capacity_t: v })) })),
                            __React.createElement("td", null,
                                __React.createElement("button", { className: "icon-button row-delete", type: "button", "aria-label": `Удалить строку ${i + 1}`, onClick: () => w.setDraft((0, plan_1.removeDecision)(plan, mode, i)) },
                                    __React.createElement(Icon_1.Icon, { name: "close", size: 16 }))))),
                        !rows.length && __React.createElement("tr", null,
                            __React.createElement("td", { colSpan: 4, className: "empty-cell" }, mode === 'supply_orders' ? 'Поставок пока нет. Добавьте источник и объём заказа.' : 'Резерв мощности ещё не задан. Это контракт, а не топливо на складе.'))))),
            __React.createElement("p", { className: "help" }, mode === 'supply_orders' ? 'Объём заказа не равен фактической поставке. Сроки и ограничения проверяются расчётным модулем.' : 'Резервирование оплачивает доступ к мощности. Физический запас задаётся и рассчитывается отдельно.'),
            __React.createElement("details", { className: "disclosure", open: undefined },
                __React.createElement("summary", null,
                    "\u0418\u043D\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u0438 ",
                    __React.createElement("span", { className: "muted" }, plan.decisions.investments.length),
                    __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
                __React.createElement("div", { className: "disclosure-body" },
                    __React.createElement("div", { className: "section-heading" },
                        __React.createElement("p", { className: "help" }, "\u0413\u043E\u0434 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442\u0441\u044F \u0432 \u043C\u043E\u0434\u0435\u043B\u044C \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0438\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0430\u0446\u0438\u0438 \u0434\u0430\u0442\u044B \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0432\u0432\u043E\u0434\u0430."),
                        __React.createElement(Ui_1.Button, { kind: "ghost", onClick: () => w.setDraft((0, plan_1.addDecision)(plan, 'investments', { investment_id: investments[0]?.investment_id || 'ZBO', year: years[0] || 2035 })) },
                            __React.createElement(Icon_1.Icon, { name: "plus" }),
                            "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u043D\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u044E")),
                    __React.createElement("div", { className: "table-wrap" },
                        __React.createElement("table", null,
                            __React.createElement("thead", null,
                                __React.createElement("tr", null,
                                    __React.createElement("th", null, "\u0418\u043D\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u044F"),
                                    __React.createElement("th", null, "\u0413\u043E\u0434"),
                                    __React.createElement("th", null, "CAPEX \u043F\u043E \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0443, \u043C\u043B\u043D \u0443.\u0435."),
                                    __React.createElement("th", null,
                                        __React.createElement("span", { className: "sr-only" }, "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435")))),
                            __React.createElement("tbody", null,
                                plan.decisions.investments.map((row, i) => {
                                    const options = [...new Set([...investments.map(r => r.investment_id), row.investment_id])];
                                    const reference = investments.find(r => r.investment_id === row.investment_id);
                                    return __React.createElement("tr", { key: i },
                                        __React.createElement("td", null,
                                            __React.createElement("select", { "aria-label": `Инвестиция ${i + 1}`, value: row.investment_id, onChange: e => w.setDraft((0, plan_1.updateDecision)(plan, 'investments', i, { investment_id: e.target.value })) }, options.map(id => __React.createElement("option", { value: id, key: id }, investments.find(r => r.investment_id === id)?.name || id)))),
                                        __React.createElement("td", null,
                                            __React.createElement(Ui_1.NumericInput, { integer: true, value: row.year, label: `Год инвестиции ${i + 1}`, onChange: v => w.setDraft((0, plan_1.updateDecision)(plan, 'investments', i, { year: v })) })),
                                        __React.createElement("td", { className: "numeric" }, reference ? (0, format_1.number)(Number(reference.total_capex_mln)) : '—'),
                                        __React.createElement("td", null,
                                            __React.createElement("button", { type: "button", className: "icon-button", "aria-label": `Удалить инвестицию ${i + 1}`, onClick: () => w.setDraft((0, plan_1.removeDecision)(plan, 'investments', i)) },
                                                __React.createElement(Icon_1.Icon, { name: "close", size: 16 }))));
                                }),
                                !plan.decisions.investments.length && __React.createElement("tr", null,
                                    __React.createElement("td", { colSpan: 4, className: "empty-cell" }, "\u0418\u043D\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u0438 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B."))))))),
            __React.createElement("details", { className: "disclosure" },
                __React.createElement("summary", null,
                    "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u044F",
                    __React.createElement(Icon_1.Icon, { name: "chevron", size: 16 })),
                __React.createElement("div", { className: "disclosure-body" },
                    __React.createElement("label", { className: "field narrow" },
                        "\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043F\u043B\u0430\u043D\u0430",
                        __React.createElement("input", { autoComplete: "off", name: "plan-id", spellCheck: false, value: plan.plan_id, required: true, onChange: e => w.setDraft({ ...plan, plan_id: e.target.value }) })),
                    __React.createElement(Ui_1.Notice, null, "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441 \u0438\u0437 \u0448\u0430\u0431\u043B\u043E\u043D\u0430 \u2014 \u0432\u0445\u043E\u0434\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u043D\u0435 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\u0435 \u0442\u043E\u043F\u043B\u0438\u0432\u043E. \u0415\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u0438 \u043E\u043F\u043B\u0430\u0442\u0443 \u0434\u043E\u043B\u0436\u043D\u0430 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C. \u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0433\u043E JSON \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439."),
                    __React.createElement("details", { className: "sub-details" },
                        __React.createElement("summary", null, "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0435\u043C\u044B\u0439 JSON"),
                        __React.createElement("pre", null, JSON.stringify(plan, null, 2)))))));
}

},
"src/features/ResultDetails.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultDetails = ResultDetails;
const react_1 = require("react");
const format_1 = require("../lib/format");
const Ui_1 = require("../components/Ui");
function ResultDetails({ w }) {
    const [tab, setTab] = (0, react_1.useState)('checks');
    const run = w.current && !w.preview ? w.project?.last_run : null, r = w.displayResult;
    if (!r)
        return __React.createElement(Ui_1.Notice, null, "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u043F\u043B\u0430\u043D. \u0423\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F.");
    if (!(0, format_1.supportedUnits)(r.units))
        return __React.createElement(__React.Fragment, null,
            __React.createElement(Ui_1.Notice, { tone: "warning" }, "\u0415\u0434\u0438\u043D\u0438\u0446\u044B \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 \u0442 / \u043C\u043B\u043D \u0443.\u0435. \u041E\u0442\u0432\u0435\u0442 \u043F\u043E\u043A\u0430\u0437\u0430\u043D \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u044F \u0432\u0435\u043B\u0438\u0447\u0438\u043D."),
            __React.createElement("pre", null, JSON.stringify(r, null, 2)));
    const years = r.yearly_balance || [];
    return __React.createElement("div", { className: "result-details" },
        __React.createElement("div", { className: "segmented" }, [['checks', 'Нарушения'], ['balance', 'Баланс'], ['finance', 'Затраты'], ['source', 'Происхождение']].map(([k, title]) => __React.createElement("button", { type: "button", key: k, "aria-pressed": tab === k, onClick: () => setTab(k) }, title))),
        tab === 'checks' && __React.createElement(__React.Fragment, null,
            __React.createElement("p", { className: "help" }, "\u0412\u0441\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043E\u0442\u0432\u0435\u0442\u0430 \u043C\u043E\u0434\u0435\u043B\u0438. \u0415\u0434\u0438\u043D\u0438\u0446\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u043C DTO \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0430 \u2014 \u043E\u043D\u0430 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u043F\u0440\u0438\u0447\u0438\u043D\u0435."),
            __React.createElement("div", { className: "table-wrap" },
                __React.createElement("table", null,
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u0413\u043E\u0434"),
                            __React.createElement("th", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430"),
                            __React.createElement("th", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442"),
                            __React.createElement("th", null, "\u041F\u0440\u0438\u0447\u0438\u043D\u0430"),
                            __React.createElement("th", null, "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u0435"))),
                    __React.createElement("tbody", null, r.constraint_checks?.map((c, i) => __React.createElement("tr", { key: i },
                        __React.createElement("td", null, c.year),
                        __React.createElement("td", null, c.constraint_id),
                        __React.createElement("td", { className: !c.passed ? 'warning-text' : '' }, c.passed ? 'Выполнено' : 'Нарушено'),
                        __React.createElement("td", null, c.detail),
                        __React.createElement("td", null, (0, format_1.number)(c.excess)))))))),
        tab === 'balance' && __React.createElement("div", { className: "table-wrap" },
            __React.createElement("table", null,
                __React.createElement("thead", null,
                    __React.createElement("tr", null,
                        __React.createElement("th", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C"),
                        years.map(b => __React.createElement("th", { key: b.year }, b.year)))),
                __React.createElement("tbody", null, [
                    ['demand_total_t', 'Общий спрос, т'], ['demand_critical_t', 'Критический спрос, т'], ['delivered_t', 'Поставлено, т'], ['served_t', 'Выдано, т'], ['shortage_t', 'Дефицит, т'], ['losses_t', 'Потери, т'], ['opening_inventory_t', 'Запас на начало, т'], ['closing_inventory_t', 'Запас на конец, т'], ['reserve_45d_target_t', 'Резерв на 45 дней, т'], ['service_level_total', 'Общий сервис'], ['service_level_critical', 'Критический сервис'],
                ].map(([key, label]) => __React.createElement("tr", { key: key },
                    __React.createElement("th", null, label),
                    years.map(b => __React.createElement("td", { key: b.year, className: "numeric" }, key.startsWith('service_') ? (0, format_1.percent)(b[key]) : (0, format_1.number)(b[key])))))))),
        tab === 'finance' && __React.createElement(__React.Fragment, null,
            __React.createElement("p", { className: "help" },
                "\u0420\u0430\u0441\u0445\u043E\u0434\u044B \u0432 \u043C\u043B\u043D \u0443\u0441\u043B\u043E\u0432\u043D\u044B\u0445 \u0434\u0435\u043D\u0435\u0436\u043D\u044B\u0445 \u0435\u0434\u0438\u043D\u0438\u0446, \u043D\u0435 \u043F\u0440\u0438\u0431\u044B\u043B\u044C. \u0412\u0441\u0435\u0433\u043E: ",
                (0, format_1.number)(r.total_cost_mln),
                "."),
            __React.createElement("div", { className: "table-wrap" },
                __React.createElement("table", null,
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u0413\u043E\u0434"),
                            __React.createElement("th", null, "\u0417\u0430\u043A\u0443\u043F\u043A\u0430"),
                            __React.createElement("th", null, "\u0411\u0440\u043E\u043D\u044C"),
                            __React.createElement("th", null, "\u0425\u0440\u0430\u043D\u0435\u043D\u0438\u0435"),
                            __React.createElement("th", null, "CAPEX"),
                            __React.createElement("th", null, "OPEX"),
                            __React.createElement("th", null, "\u0412\u0441\u0435\u0433\u043E"))),
                    __React.createElement("tbody", null, r.financial_breakdown?.map(f => __React.createElement("tr", { key: f.year },
                        __React.createElement("th", null, f.year),
                        ['procurement', 'reservation', 'holding', 'capex', 'opex', 'total'].map(k => __React.createElement("td", { key: k, className: "numeric" }, (0, format_1.number)(f[k]))))))))),
        tab === 'source' && __React.createElement(__React.Fragment, null,
            __React.createElement("p", { className: "help" },
                run ? `${(0, format_1.date)(run.created_at)} · ${run.engine.engine_id} · ${run.engine.version} · ревизия ${run.input_revision}` : `Предпросмотр /api/calc · ${(0, format_1.date)(w.preview?.createdAt || '')}`,
                " "),
            __React.createElement(Ui_1.Notice, null, "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0438\u043C\u0435\u044E\u0449\u0435\u0435\u0441\u044F \u0432 \u0430\u0440\u0445\u0438\u0432\u0435 \u044F\u0434\u0440\u043E. \u0415\u0433\u043E \u043C\u0430\u0442\u0435\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u0440\u0438\u0451\u043C\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u043E\u043C \u0438\u043B\u0438 \u0432\u0435\u0431-\u0442\u0435\u0441\u0442\u0430\u043C\u0438."),
            __React.createElement("p", { className: "help" },
                "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u044F \u0438\u0437 \u043E\u0442\u0432\u0435\u0442\u0430: ",
                __React.createElement("code", null, JSON.stringify(r.assumptions_reference))),
            __React.createElement("details", { className: "disclosure" },
                __React.createElement("summary", null, "\u041F\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u043F\u043E \u043A\u0430\u043D\u0430\u043B\u0430\u043C"),
                __React.createElement("pre", null, JSON.stringify(r.source_schedule, null, 2))),
            __React.createElement("details", { className: "disclosure" },
                __React.createElement("summary", null, "\u0412\u043D\u0443\u0442\u0440\u0438\u0433\u043E\u0434\u043E\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u0440\u0438\u0441\u043A\u0438"),
                __React.createElement("pre", null, JSON.stringify({ inventory_trace: r.inventory_trace, risk_register: r.risk_register }, null, 2))),
            __React.createElement("details", { className: "disclosure" },
                __React.createElement("summary", null, "\u0412\u0435\u0441\u044C \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438"),
                __React.createElement("pre", null, JSON.stringify(r, null, 2)))));
}

},
"src/features/ResultPanel.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultPanel = ResultPanel;
const react_1 = require("react");
const AnalyticsChart_1 = require("../components/AnalyticsChart");
const DailyChart_1 = require("../components/DailyChart");
const Icon_1 = require("../components/Icon");
const Ui_1 = require("../components/Ui");
const daily_1 = require("../lib/daily");
const format_1 = require("../lib/format");
const Controls_1 = require("../components/Controls");
const checkLabels = { RESERVE_45D: 'Резерв на 45 дней', BASE_CRITICAL_SERVICE: 'Критический сервис', BASE_TOTAL_SERVICE: 'Общий сервис', CAPACITY_EXCEEDED: 'Мощность источника', STORAGE_OVERFLOW: 'Переполнение', CAPEX_2037: 'CAPEX до 2037', CAPEX_2040: 'CAPEX до 2040', STRESS_LOSS_LIMIT: 'Потери', EMERGENCY_BASE_STREAK: 'Роль Emergency' };
const dailyFields = [
    ['opening_inventory_t', 'Запас на начало', 'т'],
    ['closing_inventory_t', 'Запас на конец', 'т'],
    ['delivered_t', 'Поступление', 'т'],
    ['demand_total_t', 'Спрос', 'т'],
    ['served_total_t', 'Обслужено', 'т'],
    ['losses_t', 'Потери', 'т'],
    ['shortage_t', 'Дефицит', 'т'],
];
function ResultPanel({ w, onDetails }) {
    const selected = w.selection?.year ?? null;
    const setSelected = (year) => w.setSelection({ source: w.selection?.source || 'Earth-Core', year });
    const [proposal, setProposal] = (0, react_1.useState)(null);
    const [chart, setChart] = (0, react_1.useState)('inventory');
    const [selectedDay, setSelectedDay] = (0, react_1.useState)(null);
    const [detailSide, setDetailSide] = (0, react_1.useState)('primary');
    const result = w.displayResult;
    if (!result)
        return __React.createElement("section", { className: "result-panel panel result-empty", "aria-label": "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0440\u0430\u0441\u0447\u0451\u0442\u0430" },
            __React.createElement("div", { className: "panel-heading" },
                __React.createElement("h2", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442")),
            __React.createElement("div", { className: "empty-result-body" },
                __React.createElement("h3", null, "\u041D\u0435\u0442 \u0440\u0430\u0441\u0447\u0451\u0442\u0430")));
    if (!(0, format_1.supportedUnits)(result.units))
        return __React.createElement("section", { className: "panel result-panel" },
            __React.createElement("div", { className: "panel-heading" },
                __React.createElement("h2", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442")),
            __React.createElement("p", { className: "inline-warning" }, "\u0415\u0434\u0438\u043D\u0438\u0446\u044B \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u043E\u0442\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F \u043E\u0442 \u0442 / \u043C\u043B\u043D \u0443.\u0435. \u0413\u0440\u0430\u0444\u0438\u043A\u0438 \u0441\u043A\u0440\u044B\u0442\u044B; \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0432 JSON."),
            __React.createElement("button", { className: "text-button", onClick: onDetails }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0432\u0435\u0442"));
    const balances = result.yearly_balance || [];
    const years = balances.map(balance => balance.year);
    const year = selected ?? years[0];
    const row = balances.find(balance => balance.year === year);
    const financial = result.financial_breakdown?.find(entry => entry.year === year);
    const index = years.indexOf(year);
    const previousYear = years.filter(value => value < year).at(-1);
    const nextYear = years.find(value => value > year);
    const other = w.displayOther && (0, format_1.supportedUnits)(w.displayOther.units) ? w.displayOther : undefined;
    const otherRow = other?.yearly_balance?.find(balance => balance.year === year);
    const costSeries = other ? [
        { key: 'primary-cost', label: scenarioCode(result), color: AnalyticsChart_1.palette.muted, values: years.map(value => valueAt(result, value)) },
        { key: 'other-cost', label: scenarioCode(other), color: AnalyticsChart_1.palette.green, dashed: true, values: years.map(value => valueAt(other, value)) },
    ] : [];
    const checks = result.constraint_checks || [];
    const failed = checks.filter(check => !check.passed);
    const yearFails = failed.filter(check => check.year === year);
    const detailResult = detailSide === 'other' && other ? other : result;
    const detailOther = detailResult === result ? other : result;
    const detailRecord = selectedDay === null ? undefined : (0, daily_1.dailyRecordAt)(detailResult, year, selectedDay);
    return __React.createElement("section", { className: "result-panel panel", "aria-labelledby": "result-title" },
        __React.createElement("div", { className: "panel-heading" },
            __React.createElement("h2", { id: "result-title" }, other ? 'Сравнение сценариев' : 'Результат'),
            __React.createElement("div", { className: "year-nav" },
                __React.createElement("button", { type: "button", className: "icon-button", "aria-label": "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0433\u043E\u0434", disabled: previousYear === undefined, onClick: () => previousYear !== undefined && setSelected(previousYear) },
                    __React.createElement(Icon_1.Icon, { name: "left", size: 14 })),
                __React.createElement("strong", null, year || '—'),
                __React.createElement("button", { type: "button", className: "icon-button", "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0433\u043E\u0434", disabled: nextYear === undefined, onClick: () => nextYear !== undefined && setSelected(nextYear) },
                    __React.createElement(Icon_1.Icon, { name: "right", size: 14 })))),
        __React.createElement("div", { className: "result-metrics" },
            __React.createElement(AnalyticsChart_1.ServiceRing, { total: row?.service_level_total, critical: row?.service_level_critical }),
            __React.createElement("div", { className: "service-values" },
                __React.createElement("div", null,
                    __React.createElement("span", null,
                        __React.createElement("i", { className: "dot blue" }),
                        "\u041E\u0431\u0449\u0438\u0439 \u0441\u0435\u0440\u0432\u0438\u0441"),
                    __React.createElement("strong", { "data-testid": "service-total" }, (0, format_1.percent)(row?.service_level_total))),
                __React.createElement("div", null,
                    __React.createElement("span", null,
                        __React.createElement("i", { className: "dot green" }),
                        "\u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439"),
                    __React.createElement("strong", null, (0, format_1.percent)(row?.service_level_critical))),
                otherRow && __React.createElement("small", null,
                    "\u0412\u0442\u043E\u0440\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439: ",
                    (0, format_1.percent)(otherRow.service_level_total),
                    " / ",
                    (0, format_1.percent)(otherRow.service_level_critical)))),
        __React.createElement("div", { className: "chart-mode", "aria-label": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C \u0433\u0440\u0430\u0444\u0438\u043A\u0430" },
            __React.createElement("button", { type: "button", "aria-pressed": chart === 'inventory', onClick: () => setChart('inventory') }, "\u0417\u0430\u043F\u0430\u0441 \u043F\u043E \u0434\u043D\u044F\u043C"),
            __React.createElement("button", { type: "button", "aria-pressed": chart === 'cost', onClick: () => setChart('cost') }, "\u0417\u0430\u0442\u0440\u0430\u0442\u044B")),
        w.displayOther && !other && __React.createElement("p", { className: "comparison-caption" }, "\u0412\u0442\u043E\u0440\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0434\u0440\u0443\u0433\u0438\u0435 \u0435\u0434\u0438\u043D\u0438\u0446\u044B. \u0421\u043E\u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043A\u0440\u044B\u0442\u043E."),
        other && chart === 'inventory' && __React.createElement("div", { className: "daily-detail-switch", "aria-label": "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0434\u043D\u0435\u0432\u043D\u044B\u0445 \u0441\u043E\u0431\u044B\u0442\u0438\u0439" },
            __React.createElement("span", null, "\u041F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u0438 \u0434\u0435\u0444\u0438\u0446\u0438\u0442:"),
            __React.createElement("button", { type: "button", "aria-pressed": detailSide === 'primary', onClick: () => setDetailSide('primary') }, scenarioCode(result)),
            __React.createElement("button", { type: "button", "aria-pressed": detailSide === 'other', onClick: () => setDetailSide('other') }, scenarioCode(other))),
        __React.createElement("div", { className: "result-chart-area" }, chart === 'inventory' && typeof year === 'number'
            ? __React.createElement(DailyChart_1.DailyChart, { result: detailResult, other: detailOther, year: year, selectedDay: selectedDay, onSelectDay: setSelectedDay, onProposeDeliveryDate: (from, to) => setProposal({ year, from, to, scenario: detailResult.scenario_id, volume: (0, daily_1.dailyRecordAt)(detailResult, year, from)?.delivered_t }) })
            : chart === 'cost' && other
                ? __React.createElement(AnalyticsChart_1.AnalyticsChart, { years: years, series: costSeries, unit: "\u043C\u043B\u043D \u0443.\u0435.", selected: year, onSelect: setSelected })
                : __React.createElement(AnalyticsChart_1.FinanceChart, { rows: result.financial_breakdown || [], selected: year, onSelect: setSelected })),
        years.length > 1 && index >= 0 && __React.createElement("div", { className: "year-slider" },
            __React.createElement(Controls_1.Range, { label: "\u0413\u043E\u0434 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0435\u0439", value: index, max: years.length - 1, onChange: value => setSelected(years[value]) }),
            __React.createElement("div", null,
                __React.createElement("span", null, years[0]),
                __React.createElement("span", null, years.at(-1)))),
        !row && __React.createElement("p", { className: "inline-warning" },
            "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430 ",
            year),
        __React.createElement("div", { className: "result-numbers" },
            __React.createElement("div", null,
                __React.createElement("span", null, "\u0414\u0435\u0444\u0438\u0446\u0438\u0442"),
                __React.createElement("strong", { className: (row?.shortage_t || 0) > 0 ? 'warning-text' : '' },
                    (0, format_1.number)(row?.shortage_t),
                    __React.createElement("small", null, " \u0442"))),
            __React.createElement("div", null,
                __React.createElement("span", null, "\u0417\u0430\u043F\u0430\u0441 \u043D\u0430 \u043A\u043E\u043D\u0435\u0446"),
                __React.createElement("strong", null,
                    (0, format_1.number)(row?.closing_inventory_t),
                    __React.createElement("small", null, " \u0442"))),
            __React.createElement("div", null,
                __React.createElement("span", null, "\u0420\u0430\u0441\u0445\u043E\u0434\u044B \u0437\u0430 \u0433\u043E\u0434"),
                __React.createElement("strong", null,
                    (0, format_1.number)(financial?.total),
                    __React.createElement("small", null, " \u043C\u043B\u043D")))),
        __React.createElement("div", { className: "compact-checks" },
            __React.createElement("button", { type: "button", className: "check-summary", onClick: onDetails },
                __React.createElement("span", null,
                    __React.createElement(Icon_1.Icon, { name: failed.length ? 'alert' : 'check', size: 15 }),
                    checks.length ? (failed.length ? `${failed.length} нарушений за горизонт` : 'Нет нарушений в ответе') : 'Проверки не переданы'),
                __React.createElement(Icon_1.Icon, { name: "right", size: 15 })),
            __React.createElement("div", { className: "check-preview" }, yearFails.slice(0, 2).map((check, checkIndex) => __React.createElement("p", { key: checkIndex, title: check.detail },
                __React.createElement("b", null, check.year),
                __React.createElement("span", null, checkLabels[check.constraint_id] || check.constraint_id),
                __React.createElement("small", null, check.excess == null ? '' : (0, format_1.number)(check.excess)))))),
        __React.createElement("div", { className: "result-footer" },
            __React.createElement("span", null, (0, format_1.scenario)(result.scenario_id)),
            __React.createElement("button", { className: "text-button", type: "button", onClick: onDetails },
                "\u0412\u0441\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F",
                __React.createElement(Icon_1.Icon, { name: "right", size: 12 }))),
        proposal && __React.createElement(Ui_1.Modal, { title: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438", onClose: () => setProposal(null) },
            __React.createElement("div", { className: "delivery-proposal" },
                __React.createElement(Ui_1.Notice, null, "\u041C\u0430\u043A\u0435\u0442 \u0434\u043B\u044F \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u044F \u0441 \u0431\u044D\u043A\u043E\u043C. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442 \u0440\u0430\u0441\u0447\u0451\u0442."),
                __React.createElement("div", { className: "daily-detail-grid" },
                    __React.createElement("div", null,
                        __React.createElement("span", null, "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 / \u0433\u043E\u0434 \u043C\u043E\u0434\u0435\u043B\u0438"),
                        __React.createElement("strong", null,
                            (0, format_1.scenario)(proposal.scenario),
                            " / ",
                            proposal.year)),
                    __React.createElement("div", null,
                        __React.createElement("span", null, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0434\u0435\u043D\u044C"),
                        __React.createElement("strong", null, proposal.from)),
                    __React.createElement("div", null,
                        __React.createElement("span", null, "\u041F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435, \u0442"),
                        __React.createElement("strong", null, (0, format_1.number)(proposal.volume)))),
                __React.createElement("label", null,
                    "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0434\u0435\u043D\u044C \u043C\u043E\u0434\u0435\u043B\u0438 ",
                    __React.createElement("input", { type: "number", min: 1, max: 365, value: proposal.to, onChange: event => { const value = event.target.valueAsNumber; if (Number.isInteger(value) && value >= 1 && value <= 365)
                            setProposal({ ...proposal, to: value }); } })),
                __React.createElement("input", { type: "range", "aria-label": "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438", value: proposal.to, min: 1, max: 365, onChange: event => setProposal({ ...proposal, to: event.target.valueAsNumber }) }),
                __React.createElement("p", null, "\u0421\u0432\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u0437\u0430 \u0434\u0435\u043D\u044C. \u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0437\u0430\u044F\u0432\u043A\u0438 \u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438 \u0432 \u0434\u043D\u0435\u0432\u043D\u043E\u043C \u043E\u0442\u0432\u0435\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u044B."),
                __React.createElement("button", { type: "button", className: "text-button", onClick: () => setProposal(null) }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435"))),
        selectedDay !== null && __React.createElement(Ui_1.Modal, { title: `День модели ${selectedDay}`, wide: true, onClose: () => setSelectedDay(null) },
            __React.createElement("div", { className: "daily-detail", "data-testid": "daily-detail" },
                other && __React.createElement("div", { className: "daily-detail-switch", "aria-label": "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0435\u0439" },
                    __React.createElement("span", null, "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439:"),
                    __React.createElement("button", { type: "button", "aria-pressed": detailSide === 'primary', onClick: () => setDetailSide('primary') }, scenarioCode(result)),
                    __React.createElement("button", { type: "button", "aria-pressed": detailSide === 'other', onClick: () => setDetailSide('other') }, scenarioCode(other))),
                __React.createElement(DailyChart_1.DailyChart, { result: detailResult, other: detailOther, year: year, range: [selectedDay - 14, selectedDay + 14], selectedDay: selectedDay, onSelectDay: setSelectedDay }),
                __React.createElement("div", { className: "daily-detail-grid" }, dailyFields.map(([field, label, unit]) => __React.createElement("div", { key: field },
                    __React.createElement("span", null, label),
                    __React.createElement("strong", null,
                        (0, format_1.number)(detailRecord?.[field]),
                        __React.createElement("small", null,
                            " ",
                            unit))))),
                !detailRecord && __React.createElement("p", { className: "inline-warning" }, "\u0417\u0430 \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B \u0434\u0430\u043D\u043D\u044B\u0435."))));
}
function valueAt(result, year) {
    return result.financial_breakdown?.find(row => row.year === year)?.total;
}
function scenarioCode(result) {
    return result.scenario_id === 'BASE' ? 'BASE' : result.scenario_id === 'MANDATORY_STRESS' ? 'STRESS' : result.scenario_id;
}

},
"src/features/RiskPanel.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskPanel = RiskPanel;
const react_1 = require("react");
const Ui_1 = require("../components/Ui");
const format_1 = require("../lib/format");
const plan_1 = require("../lib/plan");
const DailyChart_1 = require("../components/DailyChart");
function RiskPanel({ w }) {
    const [selectedScenario, setSelectedScenario] = (0, react_1.useState)(null);
    const [selectedYear, setSelectedYear] = (0, react_1.useState)(null);
    const analysis = w.risk;
    const run = analysis?.runs.find(r => r.plan.scenario_id === selectedScenario) || analysis?.runs[0];
    const years = run?.result.yearly_balance?.map(row => row.year) || [];
    const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[0];
    const changed = !!analysis && (!!w.draft && !(0, plan_1.samePlan)(analysis.basis, w.draft) || analysis.both !== w.both);
    const fields = [
        ['iterations', 'Прогоны'], ['seed', 'Seed'], ['probability_of_zero_shortage', 'Успешные прогоны'],
        ['median_shortage_t', 'Медианный дефицит, т'], ['p95_shortage_t', '95-й процентиль дефицита, т'], ['max_shortage_t', 'Максимальный дефицит, т'],
    ];
    return __React.createElement("div", { className: "risk-panel" },
        __React.createElement("div", { className: "risk-toolbar" },
            __React.createElement("span", null, analysis ? `План: ${analysis.basis.plan_id}` : 'Текущие решения'),
            __React.createElement(Ui_1.Button, { disabled: w.riskBusy || !!w.busy, onClick: () => void w.analyzeRisk() }, "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E")),
        w.riskBusy && __React.createElement("div", { className: "risk-progress", role: "status" },
            __React.createElement(Ui_1.Spinner, null),
            "\u0410\u043D\u0430\u043B\u0438\u0437 ",
            (0, format_1.scenario)(w.riskStage),
            "\u2026"),
        w.riskError && __React.createElement(Ui_1.Notice, { tone: "error" }, w.riskError),
        changed && __React.createElement(Ui_1.Notice, { tone: "warning" }, "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u044B. \u042D\u0442\u043E\u0442 \u0430\u043D\u0430\u043B\u0438\u0437 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443 \u0441\u043D\u0438\u043C\u043A\u0443 \u043F\u043B\u0430\u043D\u0430."),
        !!analysis?.runs.length && __React.createElement(__React.Fragment, null,
            __React.createElement("div", { className: "table-wrap" },
                __React.createElement("table", { className: "risk-summary" },
                    __React.createElement("caption", null, "\u041C\u043E\u043D\u0442\u0435-\u041A\u0430\u0440\u043B\u043E: \u0441\u0432\u043E\u0434\u043A\u0430 \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0445 \u043F\u0440\u043E\u0433\u043E\u043D\u043E\u0432"),
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C"),
                            analysis.runs.map(item => __React.createElement("th", { key: item.plan.scenario_id }, (0, format_1.scenario)(item.plan.scenario_id))))),
                    __React.createElement("tbody", null, fields.map(([key, label]) => __React.createElement("tr", { key: key },
                        __React.createElement("th", null, label),
                        analysis.runs.map(item => {
                            const summary = item.result.risk_register?.find(r => r.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO');
                            const value = summary?.[key], numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
                            return __React.createElement("td", { key: item.plan.scenario_id }, key === 'probability_of_zero_shortage' ? (0, format_1.percent)(numeric) : (0, format_1.number)(numeric));
                        })))))),
            __React.createElement("p", { className: "help" }, "\u00AB\u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0435 \u043F\u0440\u043E\u0433\u043E\u043D\u044B\u00BB \u2014 \u0434\u043E\u043B\u044F \u043F\u0440\u043E\u0433\u043E\u043D\u043E\u0432 \u0431\u0435\u0437 \u0434\u0435\u0444\u0438\u0446\u0438\u0442\u0430 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439 \u043F\u043E \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044F\u043C \u043C\u043E\u0434\u0435\u043B\u0438. 95-\u0439 \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u0438\u043B\u044C \u2014 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0434\u0435\u0444\u0438\u0446\u0438\u0442\u0430, \u043D\u0435 \u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u0438\u043C\u0435\u0440\u043D\u043E \u0432 95% \u043F\u0440\u043E\u0433\u043E\u043D\u043E\u0432."),
            analysis.runs.some(item => !item.result.risk_register?.some(r => r.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO')) && __React.createElement(Ui_1.Notice, null, "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0430 \u0441\u0432\u043E\u0434\u043A\u0443 \u0440\u0438\u0441\u043A\u043E\u0432 \u0434\u043B\u044F \u043E\u0434\u043D\u043E\u0433\u043E \u0438\u0437 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0435\u0432."),
            __React.createElement("div", { className: "risk-chart-heading" },
                __React.createElement("h3", null, "\u0414\u043D\u0435\u0432\u043D\u0430\u044F \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u0430"),
                __React.createElement("div", { className: "segmented" }, analysis.runs.map(item => __React.createElement("button", { type: "button", key: item.plan.scenario_id, "aria-pressed": item === run, onClick: () => setSelectedScenario(item.plan.scenario_id) }, (0, format_1.scenario)(item.plan.scenario_id)))),
                __React.createElement("label", null,
                    "\u0413\u043E\u0434 ",
                    __React.createElement("select", { value: year, onChange: e => setSelectedYear(Number(e.target.value)) }, years.map(y => __React.createElement("option", { key: y }, y))))),
            run && year !== undefined && __React.createElement(DailyChart_1.DailyChart, { result: run.result, year: year }),
            __React.createElement("p", { className: "help" }, "\u042D\u0442\u0430 \u043B\u0438\u043D\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043E\u0431\u044B\u0447\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442 \u043F\u043B\u0430\u043D\u0430. \u0418\u0441\u0442\u043E\u0440\u0438\u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0445 \u043F\u0440\u043E\u0433\u043E\u043D\u043E\u0432 \u0438 \u0430\u0432\u0430\u0440\u0438\u0439 \u043C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442.")));
}

},
"src/features/SupplyMatrix.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplyMatrix = SupplyMatrix;
const matrix_1 = require("../lib/matrix");
const format_1 = require("../lib/format");
const Controls_1 = require("../components/Controls");
const Icon_1 = require("../components/Icon");
const colorClass = { 'Earth-Core': 'core', 'Earth-Flex': 'flex', Emergency: 'emergency', 'Lunar-ISRU': 'lunar', 'Earth-New': 'new' };
const sourceInvestments = {
    'Lunar-ISRU': { id: 'LUNAR_ISRU', defaultYear: 2038 },
    'Earth-New': { id: 'EARTH_NEW', defaultYear: 2036 },
};
function SupplyMatrix({ w, onAdvanced, onSource }) {
    const selected = w.selection, setSelected = w.setSelection;
    if (!w.draft)
        return null;
    const plan = w.draft, sources = (0, matrix_1.matrixSources)(plan, w.catalog), years = (0, matrix_1.matrixYears)(plan, w.catalog);
    const investments = w.catalog?.tables.find(t => t.table_id === 'investment_options')?.rows || [];
    const s = selected ? sources.find(r => r.key === selected.source) : sources[0], year = selected?.year ?? years[0];
    const editing = s && years.includes(year) ? { source: s, year } : null;
    const focus = (source, y) => setSelected({ source: source.key, year: y });
    function inactive(source, y) {
        const required = source.key === 'Lunar-ISRU' ? 'LUNAR_ISRU' : source.key === 'Earth-New' ? 'EARTH_NEW' : null;
        if (required && !plan.decisions.investments.some(r => r.investment_id === required))
            return 'Включите инвестицию ' + source.label;
        const from = Number(source.reference?.available_from_year);
        if (from && y < from)
            return 'В справочнике доступен с ' + from;
        return '';
    }
    function change(key, source, y, value) { w.setDraft((0, matrix_1.writeCell)(plan, key, source, y, value)); }
    const cellOrder = editing ? (0, matrix_1.readCell)(plan, 'supply_orders', editing.source, year) : null;
    const cellReserve = editing ? (0, matrix_1.readCell)(plan, 'capacity_reservations', editing.source, year) : null;
    const warning = editing && inactive(editing.source, year);
    const over = cellOrder?.value !== null && cellReserve?.value !== null && s?.key !== 'Lunar-ISRU' && (cellOrder?.value || 0) > (cellReserve?.value || 0);
    return __React.createElement("section", { className: "supply-panel panel", "aria-labelledby": "matrix-title" },
        __React.createElement("div", { className: "panel-heading" },
            __React.createElement("div", null,
                __React.createElement("h2", { id: "matrix-title" }, "\u041C\u0430\u0442\u0440\u0438\u0446\u0430 \u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u044F")),
            __React.createElement("span", { className: "horizon" },
                years[0],
                __React.createElement("span", null, "\u2014"),
                years.at(-1))),
        __React.createElement("div", { className: "matrix-legend" },
            __React.createElement("span", null,
                __React.createElement("i", { className: "order-dot" }),
                "\u0417\u0430\u043A\u0430\u0437, \u0442"),
            __React.createElement("span", null,
                __React.createElement("i", { className: "reserve-dot" }),
                "\u0411\u0440\u043E\u043D\u044C, \u0442/\u0433\u043E\u0434"),
            __React.createElement("button", { type: "button", className: "text-button", onClick: onAdvanced },
                "\u041F\u043E\u043B\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438",
                __React.createElement(Icon_1.Icon, { name: "right", size: 12 }))),
        __React.createElement("fieldset", { disabled: !!w.busy, className: "matrix-fieldset" },
            __React.createElement("div", { className: "matrix-viewport" },
                __React.createElement("table", { className: "supply-matrix" },
                    __React.createElement("caption", { className: "sr-only" }, "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435: \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043F\u043E \u0441\u0442\u0440\u043E\u043A\u0430\u043C, \u0433\u043E\u0434\u044B \u043F\u043E \u0441\u0442\u043E\u043B\u0431\u0446\u0430\u043C"),
                    __React.createElement("thead", null,
                        __React.createElement("tr", null,
                            __React.createElement("th", { scope: "col" }, "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A"),
                            years.map(y => __React.createElement("th", { key: y, scope: "col", className: editing?.year === y ? 'selected-year' : '' }, y)))),
                    __React.createElement("tbody", null, sources.map(source => {
                        const definition = sourceInvestments[source.key];
                        const records = definition ? plan.decisions.investments.filter(r => r.investment_id === definition.id) : [];
                        const investment = records[0];
                        const reference = definition ? investments.find(r => r.investment_id === definition.id) : undefined;
                        const investmentYears = definition ? [...new Set([...years, definition.defaultYear, ...records.map(r => r.year)])].sort((a, b) => a - b) : [];
                        return __React.createElement("tr", { key: source.key },
                            __React.createElement("th", { scope: "row" },
                                __React.createElement("div", { className: "matrix-source-cell" },
                                    __React.createElement("button", { type: "button", className: `source-label ${colorClass[source.key] || 'custom'}`, onClick: () => onSource(source) },
                                        __React.createElement("i", null),
                                        __React.createElement("span", null,
                                            __React.createElement("strong", null, source.label))),
                                    definition && __React.createElement("div", { className: `source-investment ${investment ? 'enabled' : ''}` },
                                        records.length > 1 ? __React.createElement("button", { type: "button", className: "text-button", onClick: onAdvanced },
                                            records.length,
                                            " \u0437\u0430\u043F\u0438\u0441\u0438") : __React.createElement(Controls_1.Toggle, { label: `Включить инвестицию ${source.label}`, checked: !!investment, onChange: yes => w.setDraft((0, matrix_1.setInvestment)(plan, definition.id, yes ? definition.defaultYear : null)) }),
                                        __React.createElement("select", { title: reference?.commissioning_rule, "aria-label": `Год инвестиции ${source.label}`, disabled: !investment || records.length > 1, value: investment?.year || definition.defaultYear, onChange: e => w.setDraft((0, matrix_1.setInvestment)(plan, definition.id, Number(e.target.value))) }, investmentYears.map(y => __React.createElement("option", { key: y }, y))),
                                        __React.createElement("span", null,
                                            "CAPEX ",
                                            __React.createElement("strong", null, reference ? (0, format_1.number)(Number(reference.total_capex_mln)) : '—'))))),
                            years.map(y => {
                                const a = (0, matrix_1.readCell)(plan, 'supply_orders', source, y), b = (0, matrix_1.readCell)(plan, 'capacity_reservations', source, y), locked = inactive(source, y);
                                const hasRecords = a.indices.length > 0 || b.indices.length > 0;
                                const disabled = !!locked && !hasRecords;
                                const collision = a.indices.length > 1 || b.indices.length > 1;
                                const excess = source.key !== 'Lunar-ISRU' && a.value !== null && b.value !== null && a.value > b.value;
                                const active = editing?.source.key === source.key && editing.year === y;
                                return __React.createElement("td", { key: y, className: `${active ? 'active-cell' : ''} ${disabled ? 'locked-cell' : ''} ${excess ? 'warning-cell' : ''}`, onFocus: () => focus(source, y) }, collision ? __React.createElement("button", { type: "button", className: "collision-button", title: "\u0417\u0430\u043F\u0438\u0441\u0438 \u043D\u0435 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u044E\u0442\u0441\u044F. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u043B\u044F \u0440\u0430\u0437\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F.", onClick: onAdvanced },
                                    __React.createElement(Icon_1.Icon, { name: "alert", size: 12 }),
                                    Math.max(a.indices.length, b.indices.length),
                                    " \u0437\u0430\u043F\u0438\u0441\u0438") : __React.createElement("div", { className: "cell-pair", title: locked || (excess ? 'Заказ превышает бронь. Проверьте условия канала.' : '') },
                                    __React.createElement("div", { className: "order-input" },
                                        __React.createElement("i", null),
                                        __React.createElement(Controls_1.StepNumber, { compact: true, value: a.value, disabled: disabled, label: `Заказ ${source.label} ${y}`, onFocus: () => focus(source, y), onChange: v => change('supply_orders', source, y, v) })),
                                    __React.createElement("div", { className: "reserve-input" },
                                        __React.createElement("i", null),
                                        __React.createElement(Controls_1.StepNumber, { compact: true, value: b.value, disabled: disabled, label: `Бронь ${source.label} ${y}`, onFocus: () => focus(source, y), onChange: v => change('capacity_reservations', source, y, v) }))));
                            }));
                    }))))),
        editing && __React.createElement("div", { className: "cell-inspector" },
            __React.createElement("div", { className: "inspector-heading" },
                __React.createElement("span", null,
                    __React.createElement("strong", null, editing.source.label),
                    __React.createElement("span", { className: "muted" },
                        " / ",
                        year)),
                __React.createElement("small", null, warning ? __React.createElement(__React.Fragment, null,
                    __React.createElement(Icon_1.Icon, { name: "lock", size: 11 }),
                    warning) : over ? __React.createElement(__React.Fragment, null,
                    __React.createElement(Icon_1.Icon, { name: "alert", size: 11 }),
                    "\u0417\u0430\u043A\u0430\u0437 \u0432\u044B\u0448\u0435 \u0431\u0440\u043E\u043D\u0438") : __React.createElement(__React.Fragment, null,
                    "\u041C\u043E\u0449\u043D\u043E\u0441\u0442\u044C: ",
                    (0, format_1.number)(Number(editing.source.reference?.capacity_t_per_year) || undefined),
                    " \u0442/\u0433\u043E\u0434"))),
            __React.createElement("fieldset", { disabled: !!w.busy },
                __React.createElement("div", { className: "inspector-controls" }, [['supply_orders', 'Заказ', 'т', cellOrder], ['capacity_reservations', 'Бронь', 'т/год', cellReserve]].map(([key, title, unit, cell]) => __React.createElement("div", { className: "inspector-control", key: key },
                    __React.createElement("label", null,
                        title,
                        __React.createElement("span", null, unit)),
                    cell && cell.indices.length <= 1 ? __React.createElement(__React.Fragment, null,
                        __React.createElement(Controls_1.StepNumber, { value: cell.value, label: `${title} выбранной ячейки`, disabled: !!warning && cellOrder?.indices.length === 0 && cellReserve?.indices.length === 0, onChange: v => change(key, editing.source, year, v) }),
                        __React.createElement(Controls_1.Range, { value: cell.value, max: Number(editing.source.reference?.capacity_t_per_year) || 500, label: `${title}: ползунок`, disabled: !!warning && cellOrder?.indices.length === 0 && cellReserve?.indices.length === 0, onChange: v => change(key, editing.source, year, v) })) : __React.createElement("button", { className: "text-button", type: "button", onClick: onAdvanced }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438")))))),
        !editing && selected && __React.createElement("div", { className: "cell-inspector" },
            __React.createElement("div", { className: "inspector-heading" },
                __React.createElement("strong", null,
                    selected.source,
                    " / ",
                    selected.year),
                __React.createElement("span", null, "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432 \u043F\u043B\u0430\u043D\u0435")),
            __React.createElement("button", { type: "button", className: "text-button", onClick: onAdvanced }, "\u041F\u043E\u043B\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438")));
}

},
"src/lib/catalog.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnLabels = exports.tableLabels = void 0;
exports.tableLabels = { demand: 'Спрос', supply_sources: 'Источники снабжения', storage_options: 'Хранение', investment_options: 'Инвестиции', constraints: 'Ограничения' };
exports.columnLabels = {
    year: 'Год', base_total_t: 'Общий спрос, т', base_critical_t: 'Критический спрос, т', low_total_t: 'Низкий спрос, т', high_total_t: 'Высокий спрос, т', status: 'Статус исходника', source_id: 'Код', name: 'Название', capacity_t_per_year: 'Мощность, т/год', variable_cost_mln_per_t: 'Цена, млн у.е./т', reservation_rate_mln_per_t_year_capacity: 'Резерв: годовой тариф', take_or_pay_share: 'Take-or-pay, доля', lead_time_min_value: 'Срок, минимум', lead_time_max_value: 'Срок, максимум', lead_time_unit: 'Единица срока', reliability_profile: 'Профиль надёжности', available_from_year: 'Доступен с', notes: 'Примечание исходника', storage_id: 'Код', capacity_t: 'Ёмкость, т', loss_rate_on_throughput: 'Потери от поступления, доля', holding_cost_mln_per_t_year: 'Хранение, млн у.е./т-год', capex_mln: 'CAPEX, млн у.е.', fixed_opex_mln_per_year: 'OPEX, млн у.е./год', investment_id: 'Код', option_fee_mln: 'Опцион, млн у.е.', exercise_cost_mln: 'Реализация, млн у.е.', total_capex_mln: 'Всего CAPEX, млн у.е.', commissioning_rule: 'Правило ввода', constraint_id: 'Код', metric: 'Показатель', operator: 'Условие', value: 'Значение', unit: 'Единица', period: 'Период', scenario: 'Сценарий', severity: 'Уровень', description: 'Описание исходника'
};

},
"src/lib/comparison.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparisonCsv = comparisonCsv;
exports.comparabilityWarnings = comparabilityWarnings;
const format_js_1 = require("./format.js");
/** Flatten the API snapshot for export. No alternative calculation or scoring. */
function comparisonCsv(comparison) {
    const columns = ['project_id', 'name', 'plan_id', 'scenario_id', 'input_revision', 'input_hash', 'engine_id', 'engine_version', 'origin', 'units', 'assumptions_reference', 'year', 'demand_total_t', 'demand_critical_t', 'delivered_t', 'served_t', 'shortage_t', 'opening_inventory_t', 'closing_inventory_t', 'service_level_total', 'service_level_critical', 'annual_cost_mln', 'total_cost_mln'];
    const rows = [columns];
    for (const item of comparison.items) {
        const run = item.run, r = run.result;
        for (const b of r.yearly_balance || []) {
            const f = r.financial_breakdown?.find(f => f.year === b.year);
            rows.push([item.project_id, item.name, r.plan_id, r.scenario_id, run.input_revision, run.input_hash, run.engine.engine_id, run.engine.version, run.origin, r.units, r.assumptions_reference, b.year, b.demand_total_t, b.demand_critical_t, b.delivered_t, b.served_t, b.shortage_t, b.opening_inventory_t, b.closing_inventory_t, b.service_level_total, b.service_level_critical, f?.total, r.total_cost_mln]);
        }
    }
    return '\uFEFF' + rows.map(row => row.map(format_js_1.csvCell).join(',')).join('\r\n') + '\r\n';
}
function comparabilityWarnings(comparison) {
    const issues = [];
    const differs = (fn) => new Set(comparison.items.map(i => JSON.stringify(fn(i)))).size > 1;
    if (differs(i => (i.run.result.yearly_balance || []).map(b => b.year)))
        issues.push('Горизонты различаются. Отсутствующие годы не заменены нулями.');
    if (differs(i => i.run.result.units))
        issues.push('Единицы измерения различаются. Прямое числовое сравнение требует согласования.');
    if (differs(i => [i.run.engine.engine_id, i.run.engine.version]))
        issues.push('Результаты получены разными версиями модели.');
    if (differs(i => i.run.result.assumptions_reference))
        issues.push('Ссылки на допущения различаются. Проверьте сопоставимость планов.');
    if (comparison.items.some(i => i.run.origin === 'imported'))
        issues.push('Есть импортированные результаты без повторного расчёта на сервере.');
    return issues;
}

},
"src/lib/daily.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_DAYS_PER_YEAR = void 0;
exports.modelDayRange = modelDayRange;
exports.projectDailyTrace = projectDailyTrace;
exports.dailyRecordAt = dailyRecordAt;
exports.modelWeekTicks = modelWeekTicks;
exports.MODEL_DAYS_PER_YEAR = 365;
const measurementFields = [
    'opening_inventory_t',
    'delivered_t',
    'losses_t',
    'demand_total_t',
    'served_total_t',
    'shortage_t',
    'closing_inventory_t',
];
function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function modelDayRange(range) {
    if (!range)
        return [1, exports.MODEL_DAYS_PER_YEAR];
    const left = Number.isFinite(range[0]) ? Math.trunc(range[0]) : 1;
    const right = Number.isFinite(range[1]) ? Math.trunc(range[1]) : exports.MODEL_DAYS_PER_YEAR;
    const start = Math.max(1, Math.min(exports.MODEL_DAYS_PER_YEAR, Math.min(left, right)));
    const end = Math.max(1, Math.min(exports.MODEL_DAYS_PER_YEAR, Math.max(left, right)));
    return [start, end];
}
/** Reads model output as-is. It only validates coordinates and finite measurements. */
function projectDailyTrace(result, year, range) {
    if (!Number.isInteger(year))
        return [];
    const [start, end] = modelDayRange(range);
    const trace = Array.isArray(result.inventory_trace) ? result.inventory_trace : [];
    return trace.flatMap((value) => {
        const source = record(value);
        if (!source || source.year !== year || !Number.isInteger(source.day_of_year))
            return [];
        const day = source.day_of_year;
        if (day < start || day > end || day < 1 || day > exports.MODEL_DAYS_PER_YEAR)
            return [];
        const point = { year, day };
        if (finite(source.day))
            point.absolute_day = source.day;
        for (const field of measurementFields) {
            if (finite(source[field]))
                point[field] = source[field];
        }
        return [point];
    }).sort((left, right) => left.day - right.day);
}
function dailyRecordAt(result, year, day) {
    if (!Number.isInteger(day))
        return undefined;
    return projectDailyTrace(result, year, [day, day])[0];
}
function modelWeekTicks(range) {
    const [start, end] = modelDayRange(range);
    const first = 1 + Math.ceil((start - 1) / 7) * 7;
    const ticks = [];
    for (let day = first; day <= end; day += 7)
        ticks.push(day);
    return ticks;
}

},
"src/lib/format.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.number = number;
exports.percent = percent;
exports.date = date;
exports.scenario = scenario;
exports.safeFilename = safeFilename;
exports.csvCell = csvCell;
exports.downloadBlob = downloadBlob;
exports.jsonDownload = jsonDownload;
exports.supportedUnits = supportedUnits;
const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const percentages = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 });
const dates = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function number(value) {
    return typeof value === 'number' && Number.isFinite(value) ? numeric.format(value) : '—';
}
function percent(value) {
    return typeof value === 'number' && Number.isFinite(value) ? percentages.format(value) : '—';
}
function date(value) {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? dates.format(d) : '—';
}
function scenario(value) {
    return value === 'BASE' ? 'Базовый' : value === 'MANDATORY_STRESS' ? 'Стрессовый' : value || 'Не указан';
}
function safeFilename(value) {
    return value.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f<>:"|?*]/g, '_').slice(0, 180) || 'download.json';
}
function csvCell(value) {
    let s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(s))
        s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename(filename);
    document.body.append(a);
    a.click();
    a.remove();
    // Safari may still be reading the URL after click; revoke asynchronously.
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function jsonDownload(value, name) {
    downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }), name);
}
/** Never silently relabel data from a future/imported engine with another unit system. */
function supportedUnits(units) {
    if (!units || typeof units !== 'object')
        return false;
    const u = units;
    return u.fuel === 't' && u.currency === 'mln_units';
}

},
"src/lib/live.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatestCalculation = void 0;
exports.calculatePreview = calculatePreview;
const matrix_js_1 = require("./matrix.js");
async function calculatePreview(input, simulate) {
    const otherPlan = input.both ? (0, matrix_js_1.otherScenario)(input.plan) : undefined;
    // Await every request, including the surviving half of a failed pair.
    const replies = await Promise.allSettled([simulate(input.plan), ...(otherPlan ? [simulate(otherPlan)] : [])]);
    const failure = replies.find(r => r.status === 'rejected');
    if (failure?.status === 'rejected')
        throw failure.reason;
    const results = replies.map(r => r.value);
    return { basis: input.plan, primary: results[0], otherPlan, other: results[1], createdAt: new Date().toISOString() };
}
const clock = { now: () => performance.now(), set: (fn, ms) => setTimeout(fn, ms), clear: timer => clearTimeout(timer) };
/** One active cycle and one replaceable pending snapshot. Never retries a failed input. */
class LatestCalculation {
    run;
    publish;
    fail;
    time;
    generation = 0;
    pending = null;
    running = false;
    timer = null;
    lastStart = -Infinity;
    stopped = false;
    waiters = [];
    constructor(run, publish, fail, time = clock) {
        this.run = run;
        this.publish = publish;
        this.fail = fail;
        this.time = time;
    }
    update(input) {
        if (this.stopped)
            return;
        this.generation++;
        this.pending = input === null ? null : { input, generation: this.generation };
        if (this.timer !== null) {
            this.time.clear(this.timer);
            this.timer = null;
        }
        this.schedule();
    }
    schedule() {
        if (this.stopped || this.running || !this.pending || this.timer !== null)
            return;
        this.timer = this.time.set(() => { this.timer = null; void this.start(); }, Math.max(0, 100 - (this.time.now() - this.lastStart)));
    }
    async start() {
        const job = this.pending;
        if (!job || this.stopped)
            return;
        this.pending = null;
        this.running = true;
        this.lastStart = this.time.now();
        try {
            const output = await this.run(job.input);
            if (!this.stopped && job.generation === this.generation)
                this.publish(output);
        }
        catch (error) {
            if (!this.stopped && job.generation === this.generation)
                this.fail(error);
        }
        finally {
            this.running = false;
            this.waiters.splice(0).forEach(resolve => resolve());
            this.schedule();
        }
    }
    pause() { this.update(null); return this.running ? new Promise(resolve => this.waiters.push(resolve)) : Promise.resolve(); }
    dispose() { this.update(null); this.stopped = true; }
}
exports.LatestCalculation = LatestCalculation;

},
"src/lib/matrix.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matrixSources = matrixSources;
exports.matrixYears = matrixYears;
exports.readCell = readCell;
exports.writeCell = writeCell;
exports.setInvestment = setInvestment;
exports.otherScenario = otherScenario;
const plan_js_1 = require("./plan.js");
/** A visual row may have a short-ID alias. Stored decisions are never normalized. */
function matrixSources(plan, catalog) {
    const refs = catalog?.tables.find(t => t.table_id === 'supply_sources')?.rows || [];
    const decisions = [...plan.decisions.supply_orders, ...plan.decisions.capacity_reservations];
    const rows = refs.map(reference => {
        const aliases = [reference.name, reference.source_id].filter(Boolean);
        return { key: reference.name, label: reference.name, aliases, reference,
            writeId: decisions.find(d => aliases.includes(d.source_id))?.source_id || reference.name };
    });
    for (const decision of decisions) {
        if (!rows.some(r => r.aliases.includes(decision.source_id))) {
            rows.push({ key: decision.source_id, label: decision.source_id, aliases: [decision.source_id], writeId: decision.source_id });
        }
    }
    const order = ['Earth-Core', 'Earth-Flex', 'Emergency', 'Lunar-ISRU', 'Earth-New'];
    return rows.sort((a, b) => (order.includes(a.key) ? order.indexOf(a.key) : 999) - (order.includes(b.key) ? order.indexOf(b.key) : 999));
}
function matrixYears(plan, catalog) {
    return (0, plan_js_1.planYears)(plan, catalog);
}
function readCell(plan, key, source, year) {
    const indices = [];
    plan.decisions[key].forEach((row, i) => {
        if (row.year === year && source.aliases.includes(row.source_id))
            indices.push(i);
    });
    const row = indices.length === 1 ? plan.decisions[key][indices[0]] : null;
    const value = row ? Number(key === 'supply_orders' ? row.order_t : row.reserved_capacity_t) : null;
    return { indices, value };
}
function writeCell(plan, key, source, year, value) {
    const cell = readCell(plan, key, source, year);
    if (cell.indices.length > 1)
        throw new Error('В ячейке несколько записей. Измените каждую отдельно.');
    const field = key === 'supply_orders' ? 'order_t' : 'reserved_capacity_t';
    const next = cell.indices.length ? plan.decisions[key].map((r, i) => i === cell.indices[0] ? { ...r, [field]: value } : r)
        : [...plan.decisions[key], { year, source_id: source.writeId, [field]: value }];
    return { ...plan, decisions: { ...plan.decisions, [key]: next } };
}
/** Individual investment records have ownership: do not flatten duplicate or custom records. */
function setInvestment(plan, id, year) {
    const existing = plan.decisions.investments.filter(r => r.investment_id === id);
    if (existing.length > 1)
        throw new Error('Для инвестиции несколько записей. Измените каждую отдельно.');
    const investments = year === null ? plan.decisions.investments.filter(r => r.investment_id !== id)
        : existing.length ? plan.decisions.investments.map(r => r.investment_id === id ? { ...r, year } : r)
            : [...plan.decisions.investments, { investment_id: id, year }];
    return { ...plan, decisions: { ...plan.decisions, investments } };
}
function otherScenario(plan) {
    if (!['BASE', 'MANDATORY_STRESS'].includes(plan.scenario_id))
        throw new Error('Для сравнения обоих режимов выберите BASE или STRESS.');
    return { ...plan, scenario_id: plan.scenario_id === 'BASE' ? 'MANDATORY_STRESS' : 'BASE' };
}

},
"src/lib/motion.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedMotionScheduler = void 0;
exports.createMotionScheduler = createMotionScheduler;
const FRAME_INTERVAL_MS = 1000 / 60;
const FRAME_TOLERANCE_MS = .5;
/** A single demand-driven frame queue shared by every animated component. */
function createMotionScheduler(driver) {
    const steps = new Set();
    let frame = null;
    let nextUpdate = null;
    const requestNext = () => {
        if (frame === null && steps.size)
            frame = driver.requestFrame(runFrame);
    };
    const runFrame = timestamp => {
        frame = null;
        if (!steps.size) {
            nextUpdate = null;
            return;
        }
        if (nextUpdate === null || timestamp + FRAME_TOLERANCE_MS >= nextUpdate) {
            nextUpdate = nextUpdate === null ? timestamp + FRAME_INTERVAL_MS : nextUpdate + FRAME_INTERVAL_MS;
            if (nextUpdate < timestamp)
                nextUpdate = timestamp + FRAME_INTERVAL_MS;
            for (const step of [...steps]) {
                if (steps.has(step) && !step(timestamp))
                    steps.delete(step);
            }
        }
        if (steps.size)
            requestNext();
        else
            nextUpdate = null;
    };
    return {
        subscribe(step) {
            steps.add(step);
            requestNext();
            return () => {
                steps.delete(step);
                if (!steps.size) {
                    nextUpdate = null;
                    if (frame !== null) {
                        driver.cancelFrame(frame);
                        frame = null;
                    }
                }
            };
        },
    };
}
exports.sharedMotionScheduler = createMotionScheduler({
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle),
});

},
"src/lib/pair.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioPairCsv = scenarioPairCsv;
const format_js_1 = require("./format.js");
/** Flatten two actual responses. A stateless result is never labelled a saved run. */
function scenarioPairCsv(primary, otherPlan, otherResult) {
    const columns = ['scenario_id', 'plan_id', 'origin', 'year', 'demand_total_t', 'demand_critical_t', 'delivered_t', 'served_t', 'shortage_t', 'opening_inventory_t', 'closing_inventory_t', 'service_level_total', 'service_level_critical', 'annual_cost_mln', 'total_cost_mln', 'units', 'assumptions_reference', 'plan_snapshot_json'];
    const rows = [columns];
    for (const { result, plan, origin } of [
        { result: primary.result, plan: primary.plan_snapshot, origin: 'server-saved' },
        { result: otherResult, plan: otherPlan, origin: 'stateless-api-calc' },
    ]) {
        for (const b of result.yearly_balance || []) {
            rows.push([result.scenario_id, result.plan_id, origin, b.year, b.demand_total_t, b.demand_critical_t, b.delivered_t, b.served_t, b.shortage_t, b.opening_inventory_t, b.closing_inventory_t, b.service_level_total, b.service_level_critical, result.financial_breakdown?.find(f => f.year === b.year)?.total, result.total_cost_mln, result.units, result.assumptions_reference, plan]);
        }
    }
    return '\uFEFF' + rows.map(row => row.map(format_js_1.csvCell).join(',')).join('\r\n') + '\r\n';
}

},
"src/lib/plan.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDecision = updateDecision;
exports.removeDecision = removeDecision;
exports.addDecision = addDecision;
exports.planYears = planYears;
exports.sourceChoices = sourceChoices;
exports.validateDraft = validateDraft;
exports.samePlan = samePlan;
exports.normalizedPlan = normalizedPlan;
exports.newPlanId = newPlanId;
// All changes spread the existing objects: extension fields belong to the model team.
function updateDecision(plan, key, index, patch) {
    return { ...plan, decisions: { ...plan.decisions, [key]: plan.decisions[key].map((row, i) => i === index ? { ...row, ...patch } : row) } };
}
function removeDecision(plan, key, index) {
    return { ...plan, decisions: { ...plan.decisions, [key]: plan.decisions[key].filter((_, i) => i !== index) } };
}
function addDecision(plan, key, row) {
    return { ...plan, decisions: { ...plan.decisions, [key]: [...plan.decisions[key], row] } };
}
function planYears(plan, catalog) {
    const rows = catalog?.tables.find(t => t.table_id === 'demand')?.rows || [];
    const values = [...rows.map(r => Number(r.year)), ...(plan ? [
            ...plan.decisions.supply_orders.map(r => r.year),
            ...plan.decisions.capacity_reservations.map(r => r.year),
            ...plan.decisions.investments.map(r => r.year),
        ] : [])];
    return [...new Set(values.filter(Number.isInteger))].sort((a, b) => a - b);
}
function sourceChoices(plan, catalog) {
    return [...new Set([
            ...(catalog?.tables.find(t => t.table_id === 'supply_sources')?.rows || []).map(r => r.name),
            ...plan.decisions.supply_orders.map(r => r.source_id),
            ...plan.decisions.capacity_reservations.map(r => r.source_id),
        ].filter(Boolean))];
}
function validateDraft(name, plan) {
    const errors = [];
    if (!name.trim() || name.trim().length > 140)
        errors.push('Название плана: от 1 до 140 символов.');
    if (!plan.plan_id.trim())
        errors.push('Укажите идентификатор плана.');
    if (!plan.scenario_id.trim())
        errors.push('Выберите сценарий.');
    const good = (x) => Number.isFinite(x) && x >= 0;
    if (!good(plan.decisions.inventory_policy.initial_inventory_t))
        errors.push('Начальный запас: введите число не меньше нуля.');
    for (const [key, label] of [['supply_orders', 'Поставка'], ['capacity_reservations', 'Резервирование'], ['investments', 'Инвестиция']]) {
        plan.decisions[key].forEach((row, i) => {
            if (!Number.isInteger(row.year) || row.year < 1)
                errors.push(`${label}, строка ${i + 1}: укажите целый год.`);
            const id = key === 'investments' ? row.investment_id : row.source_id;
            if (!id?.trim())
                errors.push(`${label}, строка ${i + 1}: укажите ${key === 'investments' ? 'инвестицию' : 'источник'}.`);
            if (key !== 'investments') {
                const value = key === 'supply_orders' ? row.order_t : row.reserved_capacity_t;
                if (!good(value))
                    errors.push(`${label}, строка ${i + 1}: объём должен быть числом не меньше нуля.`);
            }
        });
    }
    return errors;
}
function stable(value) {
    if (typeof value === 'number' && !Number.isFinite(value))
        return `!number:${String(value)}`;
    if (Array.isArray(value))
        return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'undefined';
}
function samePlan(a, b) { return stable(a) === stable(b); }
// Only API-normalized input is accepted as editor state. No hidden default inventory here.
function normalizedPlan(value) {
    const p = value;
    if (!p || typeof p.plan_id !== 'string' || typeof p.scenario_id !== 'string' || !p.decisions ||
        !Array.isArray(p.decisions.supply_orders) || !Array.isArray(p.decisions.capacity_reservations) ||
        !Array.isArray(p.decisions.investments) || typeof p.decisions.inventory_policy?.initial_inventory_t !== 'number') {
        throw new Error('API вернул неполный план. Проверьте совместимость контракта.');
    }
    return p;
}
/** Unique client-side plan label, also available over plain HTTP LAN deployments. */
function newPlanId() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return 'plan-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

},
"src/lib/plot.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signedStack = signedStack;
/** Plot coordinates only: positive and negative components stack on opposite sides.
 * This does not recompute or replace the model's reported financial total.
 */
function signedStack(values) {
    let min = 0;
    let max = 0;
    const segments = [];
    values.forEach((value, index) => {
        if (value === undefined || !Number.isFinite(value))
            return;
        const from = value >= 0 ? max : min;
        const to = from + value;
        if (value >= 0)
            max = to;
        else
            min = to;
        segments.push({ index, from, to });
    });
    return { min, max, segments };
}

},
"src/lib/risk.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRisks = calculateRisks;
const matrix_js_1 = require("./matrix.js");
/** Explicit request only: never used by the live preview scheduler. */
async function calculateRisks(basis, both, calculate, publish, stage) {
    const plans = both ? [basis, (0, matrix_js_1.otherScenario)(basis)] : [basis];
    for (const plan of plans) {
        stage(plan.scenario_id);
        const result = await calculate(plan);
        publish({ plan, result });
    }
}

},
"src/main.tsx":(module,exports,require)=>{
const __React=require('react');
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const App_1 = __importDefault(require("./App"));
require("./styles.css");
class ErrorBoundary extends react_1.default.Component {
    state = { error: false };
    static getDerivedStateFromError() { return { error: true }; }
    componentDidCatch(error) { console.error('UI render failure', error); }
    render() { return this.state.error ? __React.createElement("main", { className: "fatal-error" },
        __React.createElement("h1", null, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441"),
        __React.createElement("p", null, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u043D\u0430\u0445\u043E\u0434\u044F\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443; \u043F\u0440\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0439 \u043E\u0448\u0438\u0431\u043A\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C API."),
        __React.createElement("button", { type: "button", onClick: () => location.reload() }, "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443")) : this.props.children; }
}
(0, client_1.createRoot)(document.getElementById('root')).render(__React.createElement(ErrorBoundary, null,
    __React.createElement(App_1.default, null)));

},
"src/state/useLivePreview.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLivePreview = useLivePreview;
const react_1 = require("react");
const client_1 = require("../api/client");
const live_1 = require("../lib/live");
const plan_1 = require("../lib/plan");
function useLivePreview(plan, both, enabled, scope) {
    const [value, setValue] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const completed = (0, react_1.useRef)(null);
    const queue = (0, react_1.useRef)(null);
    (0, react_1.useLayoutEffect)(() => {
        const instance = new live_1.LatestCalculation(async (input) => ({ scope: input.scope, result: await (0, live_1.calculatePreview)(input, client_1.api.simulate) }), result => { completed.current = result; setValue(result); setError(null); }, setError);
        queue.current = instance;
        return () => { instance.dispose(); queue.current = null; };
    }, []);
    (0, react_1.useLayoutEffect)(() => {
        setError(null);
        const previous = completed.current;
        const matches = previous?.scope === scope && !!plan && (0, plan_1.samePlan)(previous.result.basis, plan) && !!previous.result.other === both;
        queue.current?.update(enabled && plan && !matches && !(0, plan_1.validateDraft)('preview', plan).length ? { plan, both, scope } : null);
        if (enabled && matches)
            setValue(previous);
    }, [plan, both, enabled, scope]);
    const displayed = value?.scope === scope ? value.result : null;
    const fresh = !!displayed && !!plan && (0, plan_1.samePlan)(displayed.basis, plan) && !!displayed.other === both;
    const accept = (result) => { const next = { scope, result }; completed.current = next; setValue(next); setError(null); };
    return { displayed, fresh, error, accept, clearError: () => setError(null), invalidate: () => queue.current?.update(null), pause: () => queue.current?.pause() ?? Promise.resolve() };
}

},
"src/state/useWorkspace.ts":(module,exports,require)=>{
const __React=require('react');
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWorkspace = useWorkspace;
const react_1 = require("react");
const client_1 = require("../api/client");
const plan_1 = require("../lib/plan");
const matrix_1 = require("../lib/matrix");
const useLivePreview_1 = require("./useLivePreview");
const risk_1 = require("../lib/risk");
function initialView() { const v = new URLSearchParams(location.search).get('view'); return ['overview', 'plan', 'compare', 'data'].includes(v || '') ? v : 'plan'; }
function urlUpdate(view, id) {
    const u = new URL(location.href);
    u.searchParams.set('view', view);
    if (id)
        u.searchParams.set('project', id);
    else
        u.searchParams.delete('project');
    history.replaceState(null, '', u);
}
function useWorkspace() {
    const [both, setBothState] = (0, react_1.useState)(false);
    const [scope, setScope] = (0, react_1.useState)(0);
    const [selection, setSelection] = (0, react_1.useState)(null);
    const [pair, setPair] = (0, react_1.useState)(null);
    const [view, setViewState] = (0, react_1.useState)(initialView);
    const [project, setProject] = (0, react_1.useState)(null);
    const [draft, setDraftState] = (0, react_1.useState)(null);
    const [name, setNameState] = (0, react_1.useState)('Новый план');
    const [edited, setEdited] = (0, react_1.useState)(false);
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [catalog, setCatalog] = (0, react_1.useState)(null);
    const [meta, setMeta] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [busy, setBusy] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const [message, setMessage] = (0, react_1.useState)('');
    const [risk, setRisk] = (0, react_1.useState)(null);
    const [riskBusy, setRiskBusy] = (0, react_1.useState)(false), [riskStage, setRiskStage] = (0, react_1.useState)('');
    const [riskError, setRiskError] = (0, react_1.useState)('');
    const riskLock = (0, react_1.useRef)(false), mounted = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const lock = (0, react_1.useRef)(false);
    const live = (0, useLivePreview_1.useLivePreview)(draft, both, !loading && !busy && !riskBusy, scope);
    const setBoth = (value) => { if (value !== both) {
        live.invalidate();
        setBothState(value);
    } };
    const resetPreview = () => { live.invalidate(); setScope(v => v + 1); setSelection(null); };
    const inputChanged = !!draft && (project ? !(0, plan_1.samePlan)(draft, project.plan) : edited);
    const dirty = !!draft && (project ? (inputChanged || name !== project.name) : edited);
    const current = !!project && project.result_state === 'current' && !inputChanged;
    const setView = (0, react_1.useCallback)((v) => { setViewState(v); urlUpdate(v, project?.project_id); }, [project?.project_id]);
    const adopt = (0, react_1.useCallback)((p) => { setPair(null); setProject(p); setDraftState((0, plan_1.normalizedPlan)(p.plan)); setNameState(p.name); setEdited(false); urlUpdate(view, p.project_id); }, [view]);
    const refreshList = (0, react_1.useCallback)(async () => { setProjects(await client_1.api.list()); }, []);
    (0, react_1.useEffect)(() => {
        let active = true;
        (async () => {
            try {
                const [m, c, list] = await Promise.all([client_1.api.meta(), client_1.api.catalog(), client_1.api.list()]);
                if (!active)
                    return;
                setMeta(m);
                setCatalog(c);
                setProjects(list);
                const requested = new URLSearchParams(location.search).get('project');
                if (requested || list.length) {
                    const p = await client_1.api.project(requested || list[0].project_id);
                    if (active) {
                        setProject(p);
                        setDraftState((0, plan_1.normalizedPlan)(p.plan));
                        setNameState(p.name);
                        urlUpdate(initialView(), p.project_id);
                    }
                }
                else {
                    const p = await client_1.api.template();
                    if (active)
                        setDraftState((0, plan_1.normalizedPlan)(p));
                }
            }
            catch (e) {
                if (active)
                    setError(e);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);
    (0, react_1.useEffect)(() => {
        const f = (e) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', f);
        return () => window.removeEventListener('beforeunload', f);
    }, [dirty]);
    (0, react_1.useEffect)(() => {
        if (!message)
            return;
        const timer = setTimeout(() => setMessage(''), 4500);
        return () => clearTimeout(timer);
    }, [message]);
    async function execute(label, work) {
        if (lock.current || riskLock.current)
            return;
        lock.current = true;
        setBusy(label);
        setError(null);
        setMessage('');
        try {
            await live.pause();
            return await work();
        }
        catch (e) {
            setError(e);
            return undefined;
        }
        finally {
            lock.current = false;
            setBusy('');
        }
    }
    function assertValid() {
        if (!draft)
            throw new Error('Сначала создайте или откройте план.');
        const errors = (0, plan_1.validateDraft)(name, draft);
        if (errors.length)
            throw new Error(errors.join('\n'));
        return draft;
    }
    async function persist() {
        const p = assertValid();
        if (project && !dirty)
            return project;
        const saved = project ? await client_1.api.update(project.project_id, name.trim(), p, project.revision) : await client_1.api.create(name.trim(), p);
        adopt(saved);
        return saved;
    }
    async function listAfterSuccess() {
        try {
            await refreshList();
        }
        catch {
            setMessage('Изменение сохранено. Не удалось обновить список планов.');
        }
    }
    async function save() {
        return execute('Сохраняем…', async () => {
            const saved = await persist();
            const calculated = saved.result_state === 'current' ? saved : await client_1.api.calculate(saved.project_id, saved.revision);
            adopt(calculated);
            const basis = (0, plan_1.normalizedPlan)(calculated.plan);
            const createdAt = calculated.last_run?.created_at || new Date().toISOString();
            if (calculated.last_run) {
                if (both) {
                    const otherPlan = (0, matrix_1.otherScenario)(basis);
                    let other;
                    try {
                        other = await client_1.api.simulate(otherPlan);
                    }
                    catch (error) {
                        live.accept({ basis, primary: calculated.last_run.result, createdAt });
                        throw error;
                    }
                    setPair({ basis, otherPlan, other, createdAt });
                    live.accept({ basis, primary: calculated.last_run.result, otherPlan, other, createdAt });
                }
                else
                    live.accept({ basis, primary: calculated.last_run.result, createdAt });
            }
            setMessage('План и результат сохранены');
            await listAfterSuccess();
            return calculated;
        });
    }
    async function calculate() {
        return execute('Рассчитываем…', async () => {
            const saved = await persist();
            const calculated = await client_1.api.calculate(saved.project_id, saved.revision);
            adopt(calculated);
            await listAfterSuccess();
            if (both) {
                const basis = (0, plan_1.normalizedPlan)(calculated.plan);
                const otherPlan = (0, matrix_1.otherScenario)(basis);
                const other = await client_1.api.simulate(otherPlan);
                setPair({ basis, otherPlan, other, createdAt: new Date().toISOString() });
            }
            setViewState('plan');
            urlUpdate('plan', calculated.project_id);
            setMessage(both ? 'Оба сценария рассчитаны' : 'Результат получен');
        });
    }
    async function load(id) { return execute('Открываем…', async () => { const loaded = await client_1.api.project(id); resetPreview(); adopt(loaded); }); }
    async function newPlan() {
        return execute('Создаём…', async () => {
            const p = (0, plan_1.normalizedPlan)(await client_1.api.template());
            resetPreview();
            setPair(null);
            setProject(null);
            setNameState('Новый план');
            setDraftState({ ...p, plan_id: (0, plan_1.newPlanId)() });
            setEdited(false);
            setViewState('plan');
            urlUpdate('plan');
        });
    }
    async function copy(copyName, scenarioId) {
        return execute('Создаём копию…', async () => {
            const p = assertValid();
            const saved = await client_1.api.create(copyName.trim(), { ...p, plan_id: (0, plan_1.newPlanId)(), scenario_id: scenarioId });
            resetPreview();
            adopt(saved);
            await listAfterSuccess();
            setMessage('Копия создана');
            return saved;
        });
    }
    async function remove() {
        return execute('Удаляем…', async () => {
            if (!project)
                return;
            await client_1.api.remove(project.project_id, project.revision);
            const list = await client_1.api.list();
            resetPreview();
            setProjects(list);
            if (list.length)
                adopt(await client_1.api.project(list[0].project_id));
            else {
                setProject(null);
                setDraftState((0, plan_1.normalizedPlan)(await client_1.api.template()));
                setNameState('Новый план');
                setEdited(false);
                setViewState('plan');
                urlUpdate('plan');
            }
            setMessage('План удалён');
        });
    }
    async function importFile(file) {
        return execute('Импортируем…', async () => {
            if (file.size > (meta?.max_upload_bytes || 2097152))
                throw new Error('Файл превышает допустимый размер ' + (meta?.max_upload_bytes || 2097152) + ' байт.');
            if (!file.name.toLowerCase().endsWith('.json'))
                throw new Error('Выберите JSON-план или JSON-проект. CSV/XLSX ещё не подключены к модели.');
            let probe;
            try {
                probe = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
            }
            catch {
                throw new Error('Не удалось прочитать JSON. Проверьте синтаксис файла.');
            }
            if (probe && typeof probe === 'object' && 'schema_version' in probe && 'project_id' in probe) {
                const imported = await client_1.api.importProject(file);
                resetPreview();
                adopt(imported);
                urlUpdate('plan', imported.project_id);
                await listAfterSuccess();
                setMessage('Проект импортирован отдельной копией');
            }
            else {
                const p = await client_1.api.importPlan(file);
                resetPreview();
                setProject(null);
                setNameState(file.name.replace(/\.json$/i, '').slice(0, 140));
                setDraftState((0, plan_1.normalizedPlan)(p.plan));
                setEdited(true);
                urlUpdate('plan');
                setMessage(p.normalized ? 'План импортирован. API добавил поля по умолчанию — проверьте значения.' : 'План импортирован — сохраните или рассчитайте его.');
            }
            setViewState('plan');
        });
    }
    async function analyzeRisk() {
        if (riskLock.current || lock.current)
            return;
        let basis;
        try {
            basis = structuredClone(assertValid());
        }
        catch (error) {
            setRiskError((0, client_1.errorText)(error));
            return;
        }
        const pairMode = both;
        riskLock.current = true;
        setRiskBusy(true);
        setRiskError('');
        setRisk({ basis, both: pairMode, runs: [], createdAt: new Date().toISOString() });
        try {
            await live.pause();
            if (!mounted.current)
                return;
            await (0, risk_1.calculateRisks)(basis, pairMode, client_1.api.analyzeRisk, run => { if (mounted.current)
                setRisk(previous => previous ? { ...previous, runs: [...previous.runs, run] } : previous); }, scenario => { if (mounted.current)
                setRiskStage(scenario); });
        }
        catch (error) {
            if (mounted.current)
                setRiskError((0, client_1.errorText)(error));
        }
        finally {
            riskLock.current = false;
            if (mounted.current) {
                setRiskBusy(false);
                setRiskStage('');
            }
        }
    }
    async function saveOther() {
        return execute('Сохраняем второй сценарий…', async () => {
            if (!pair || !draft || !(0, plan_1.samePlan)(pair.basis, draft))
                throw new Error('Сначала рассчитайте оба сценария.');
            const saved = await client_1.api.create(name + ' — ' + (pair.otherPlan.scenario_id === 'BASE' ? 'BASE' : 'STRESS'), { ...pair.otherPlan, plan_id: (0, plan_1.newPlanId)() });
            await client_1.api.calculate(saved.project_id, saved.revision);
            await listAfterSuccess();
            setMessage('Второй сценарий сохранён отдельным проектом');
        });
    }
    async function exportFile(kind) {
        return execute('Готовим файл…', async () => {
            if (kind === 'plan') {
                await client_1.api.exportPlan(assertValid());
                return;
            }
            if (kind === 'project') {
                const p = await persist();
                await listAfterSuccess();
                await client_1.api.exportProject(p.project_id);
                return;
            }
            if (!project || !current || dirty)
                throw new Error('Сначала сохраните и пересчитайте текущий план.');
            await client_1.api.exportResult(project.project_id, kind);
        });
    }
    const displayed = live.displayed;
    const displayResult = displayed?.primary ?? (current ? project?.last_run?.result : null) ?? null;
    const displayOther = both ? displayed?.other ?? null : null;
    const reportedError = error || live.error;
    return { risk, riskBusy, riskStage, riskError, analyzeRisk, displayResult, displayOther, preview: displayed, previewFresh: live.fresh, selection, setSelection, both, setBoth, pair: pair && draft && (0, plan_1.samePlan)(pair.basis, draft) ? pair : null, saveOther, view, setView, project, draft, name, projects, catalog, meta, loading, busy, error, message, dirty, inputChanged, current,
        setDraft: (p) => { live.invalidate(); setDraftState(p); setEdited(true); setError(null); },
        setName: (v) => { setNameState(v); setEdited(true); },
        setError, clearError: () => { setError(null); live.clearError(); }, setMessage, execute, save, calculate, load, newPlan, copy, remove, importFile, exportFile, refreshList,
        errorMessage: reportedError ? (0, client_1.errorText)(reportedError) : '', requestId: reportedError instanceof client_1.ApiError ? reportedError.requestId : '', };
}

}};
const __cache={};function __resolve(from,name){const parts=from.split('/');parts.pop();for(const part of name.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part);}const base=parts.join('/');return [base,base+'.ts',base+'.tsx',base.replace(/\.js$/,'.ts'),base.replace(/\.js$/,'.tsx')].find(k=>__modules[k]);}
function __load(id){if(__cache[id])return __cache[id].exports;const m={exports:{}};__cache[id]=m;__modules[id](m,m.exports,name=>{if(name==='react')return __vr(96540);if(name==='react-dom/client')return __vr(22551);if(name.endsWith('.css'))return {};const target=__resolve(id,name);if(!target)throw Error('Missing module: '+id+' -> '+name);return __load(target);});return m.exports;}
__load('src/main.tsx');
})();
