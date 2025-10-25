(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/web_serona_web_edge-wrapper_c61f1ef9.js",
"[project]/web/serona/web/edge-wrapper.js { MODULE => \"[project]/web/serona/web/node_modules/next/dist/esm/build/templates/edge-app-route.js { INNER_ROUTE_ENTRY => \\\"[project]/web/serona/web/node_modules/next/dist/esm/build/templates/app-route.js { INNER_APP_ROUTE => \\\\\\\"[project]/web/serona/web/app/api/agent/chat/route.ts [app-edge-route] (ecmascript)\\\\\\\" } [app-edge-route] (ecmascript)\\\" } [app-edge-route] (ecmascript)\" } [app-edge-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

self._ENTRIES ||= {};
const modProm = Promise.resolve().then(()=>__turbopack_context__.i('[project]/web/serona/web/node_modules/next/dist/esm/build/templates/edge-app-route.js { INNER_ROUTE_ENTRY => "[project]/web/serona/web/node_modules/next/dist/esm/build/templates/app-route.js { INNER_APP_ROUTE => \\"[project]/web/serona/web/app/api/agent/chat/route.ts [app-edge-route] (ecmascript)\\" } [app-edge-route] (ecmascript)" } [app-edge-route] (ecmascript)'));
modProm.catch(()=>{});
self._ENTRIES["middleware_app/api/agent/chat/route"] = new Proxy(modProm, {
    get (modProm, name) {
        if (name === "then") {
            return (res, rej)=>modProm.then(res, rej);
        }
        let result = (...args)=>modProm.then((mod)=>(0, mod[name])(...args));
        result.then = (res, rej)=>modProm.then((mod)=>mod[name]).then(res, rej);
        return result;
    }
});
}),
]);

//# sourceMappingURL=web_serona_web_edge-wrapper_c61f1ef9.js.map