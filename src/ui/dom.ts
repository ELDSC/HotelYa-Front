export function element<K extends keyof HTMLElementTagNameMap>(
    tag: K, className = '', text?: unknown,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}
export function requiredElement<K extends keyof HTMLElementTagNameMap>(id: string, tag: K): HTMLElementTagNameMap[K] {
    const node = document.getElementById(id);
    if (!node || node.tagName.toLowerCase() !== tag) throw new Error(`Falta ${tag}#${id}.`);
    return node as HTMLElementTagNameMap[K];
}
