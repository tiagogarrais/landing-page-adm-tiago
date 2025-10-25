(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/Header.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function Header() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                children: "Problemas de Gestão? Eu Resolvo com Tecnologia."
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Header.js",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "subheadline",
                children: "Sou Administrador e programador. Uso código como ferramenta para eliminar retrabalho, burocracia e perda de tempo na sua operação."
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Header.js",
                lineNumber: 5,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Header.js",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Hero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function Hero() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "hero",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "Com mais de ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "highlight",
                        children: "10 anos atuando em gestão"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 5,
                        columnNumber: 21
                    }, this),
                    " ",
                    "(setor público e privado), vi de perto como processos manuais, planilhas descontroladas e sistemas genéricos",
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "consomem tempo, geram erros e esgotam equipes"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 8,
                        columnNumber: 9
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "Por isso, decidi ir além da análise:",
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "aprendi a desenvolver sistemas sob medida"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 13,
                        columnNumber: 9
                    }, this),
                    " — não por paixão à tecnologia, mas por compromisso com a",
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "eficiência da gestão"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 15,
                        columnNumber: 9
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                lineNumber: 11,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "value-badges",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "badge",
                        children: "📊 Entendo sua dor como gestor"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 19,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "badge",
                        children: "🛠️ Código é minha ferramenta, não meu fim"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "badge",
                        children: "🔒 Sistemas privados, seguros e com login"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "Cada projeto nasce de uma ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "necessidade real de gestão"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                        lineNumber: 25,
                        columnNumber: 35
                    }, this),
                    " — não de uma lista de funcionalidades técnicas. O resultado? Processos automatizados, dados confiáveis e equipes livres para focar no que realmente importa."
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Cases
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function Cases() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "cases-carousel",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                children: "Casos Reais de Sucesso"
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "cases-list",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "case",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                children: "📌 Caso Real: Digitação de Dados de Planilha"
                            }, void 0, false, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                lineNumber: 7,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: [
                                            "⏱️ Eliminamos ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "30 horas"
                                            }, void 0, false, {
                                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                                lineNumber: 10,
                                                columnNumber: 29
                                            }, this),
                                            " de digitação manual (950 linhas digitadas em 100 minutos vs. 1900 minutos manuais)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 9,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: "✅ Eliminação de erros humanos na transcrição de dados"
                                    }, void 0, false, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 13,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: "👥 Equipe administrativa recuperou tempo para tarefas estratégicas"
                                    }, void 0, false, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 14,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: [
                                            "🔗",
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "https://www.youtube.com/watch?v=VIDEO_ID",
                                                target: "_blank",
                                                style: {
                                                    color: "#1a73e8",
                                                    textDecoration: "none"
                                                },
                                                children: "Assista ao vídeo do caso"
                                            }, void 0, false, {
                                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                                lineNumber: 19,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 17,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                lineNumber: 8,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                        lineNumber: 6,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "case",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                children: "📌 Caso Real: Sistema de Inventário de Bens Patrimoniais"
                            }, void 0, false, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                lineNumber: 30,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: "🔐 Sistema completo com login e controle de acesso seguro"
                                    }, void 0, false, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 32,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: "📊 Dashboard e relatórios para gestão profissional de inventário"
                                    }, void 0, false, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 33,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: "✅ Simplificação e profissionalização do trabalho de inventário de bens"
                                    }, void 0, false, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 36,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: [
                                            "🔗",
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "https://inventario-tiago.vercel.app",
                                                target: "_blank",
                                                style: {
                                                    color: "#1a73e8",
                                                    textDecoration: "none"
                                                },
                                                children: "Acesse o sistema: inventario-tiago.vercel.app"
                                            }, void 0, false, {
                                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                                lineNumber: 42,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                        lineNumber: 40,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
                lineNumber: 5,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Cases;
var _c;
__turbopack_context__.k.register(_c, "Cases");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ScreensCarousel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
function ScreensCarousel() {
    _s();
    const [currentIndex, setCurrentIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const totalItems = 2;
    const moveSlide = (direction)=>{
        setCurrentIndex((prevIndex)=>{
            let newIndex = prevIndex + direction;
            if (newIndex < 0) newIndex = totalItems - 1;
            if (newIndex >= totalItems) newIndex = 0;
            return newIndex;
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "carousel",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "carousel-inner",
                style: {
                    transform: `translateX(-${currentIndex * 100}%)`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "carousel-item",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: "https://via.placeholder.com/400",
                            alt: "Sistema de Gestão Escolar"
                        }, void 0, false, {
                            fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                            lineNumber: 23,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "carousel-item",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: "https://via.placeholder.com/400",
                            alt: "Plataforma de Atendimento Público"
                        }, void 0, false, {
                            fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                            lineNumber: 34,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: "carousel-btn prev",
                onClick: ()=>moveSlide(-1),
                children: "‹"
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: "carousel-btn next",
                onClick: ()=>moveSlide(1),
                children: "›"
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
                lineNumber: 43,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(ScreensCarousel, "tusBbsahUVevXfyh6oH5R6YDC9Q=");
_c = ScreensCarousel;
var _c;
__turbopack_context__.k.register(_c, "ScreensCarousel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Form
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
function Form() {
    _s();
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        nome: "",
        email: "",
        problema: ""
    });
    const handleChange = (e)=>{
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };
    const sendToWhatsApp = (e)=>{
        e.preventDefault();
        const { nome, email, problema } = formData;
        const message = `Olá, meu nome é ${nome}.\nEmail: ${email}\nProblema: ${problema}`;
        const url = `https://wa.me/5588997230866?text=${encodeURIComponent(message)}`;
        window.location.href = url;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "form-section",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                children: "Descreva seu problema de gestão — não sua ideia de sistema."
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: sendToWhatsApp,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        id: "nome",
                        placeholder: "Seu nome",
                        required: true,
                        value: formData.nome,
                        onChange: handleChange
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "email",
                        id: "email",
                        placeholder: "Seu e-mail profissional",
                        required: true,
                        value: formData.email,
                        onChange: handleChange
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                        id: "problema",
                        placeholder: "Ex: 'Perco 15h por semana conferindo planilhas de estoque' ou 'Meu time gasta dias gerando relatórios manuais'...",
                        required: true,
                        value: formData.problema,
                        onChange: handleChange
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        className: "btn",
                        children: "Solicitar análise"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
                lineNumber: 27,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_s(Form, "Apx1sl2YLjNi58oKVuRbG8EwZCI=");
_c = Form;
var _c;
__turbopack_context__.k.register(_c, "Form");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Footer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function Footer() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "© 2025 — Adm. Tiago das Graças Arrais, CRA/CE 11660, Administrador & Solucionador de Problemas de Gestão. Todos os direitos reservados."
            }, void 0, false, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "Instagram:",
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: "https://instagram.com/admprogramador",
                        target: "_blank",
                        style: {
                            color: "#1a73e8",
                            textDecoration: "none"
                        },
                        children: "@admprogramador"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js",
                        lineNumber: 10,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js",
                lineNumber: 8,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Footer;
var _c;
__turbopack_context__.k.register(_c, "Footer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Header$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/Header.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Hero$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/Hero.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Cases$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/Cases.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$ScreensCarousel$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/ScreensCarousel.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Form$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/Form.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Footer$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documentos/Github/landing-page-adm-tiago/components/Footer.js [client] (ecmascript)");
;
;
;
;
;
;
;
;
function Home() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
                        children: "Problemas de Gestão? Eu Resolvo com Tecnologia"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 13,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "description",
                        content: "Administrador com 10+ anos de experiência que resolve problemas de gestão com sistemas web customizados. Automatize processos, elimine retrabalho e recupere horas da sua equipe."
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 14,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        property: "og:title",
                        content: "Problemas de gestão? Eu resolvo com tecnologia — sem ser técnico."
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 18,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        property: "og:description",
                        content: "Sou Administrador e programador. Uso código como ferramenta para eliminar gargalos operacionais na sua empresa ou órgão público."
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        property: "og:type",
                        content: "website"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1.0"
                    }, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "container",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Header$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Hero$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                                lineNumber: 32,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Cases$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                                lineNumber: 33,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Form$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                                lineNumber: 37,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documentos$2f$Github$2f$landing$2d$page$2d$adm$2d$tiago$2f$components$2f$Footer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js",
                lineNumber: 29,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/Documentos/Github/landing-page-adm-tiago/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/Documentos/Github/landing-page-adm-tiago/pages/index.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__56ab3f35._.js.map