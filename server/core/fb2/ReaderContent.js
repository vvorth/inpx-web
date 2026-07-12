const allowedReaderImageMimeTypes = new Set([
    'image/avif',
    'image/bmp',
    'image/gif',
    'image/jpeg',
    'image/jxl',
    'image/png',
    'image/vnd.microsoft.icon',
    'image/webp',
    'image/x-icon',
]);

const maxReaderImageBase64Length = 32*1024*1024;

function normalizeReaderImageBase64(value = '') {
    const result = String(value || '').replace(/\s+/g, '');
    if (!result || result.length > maxReaderImageBase64Length || result.length % 4 === 1)
        return '';
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(result))
        return '';

    const paddingLength = result.endsWith('==') ? 2 : (result.endsWith('=') ? 1 : 0);
    if (paddingLength && result.length % 4 !== 0)
        return '';

    return result;
}

function createReaderImageDataUrl(contentType = '', base64 = '') {
    const normalizedType = String(contentType || '').trim().toLowerCase();
    if (!allowedReaderImageMimeTypes.has(normalizedType))
        return '';

    const normalizedBase64 = normalizeReaderImageBase64(base64);
    if (!normalizedBase64)
        return '';

    return `data:${normalizedType};base64,${normalizedBase64}`;
}

module.exports = {
    allowedReaderImageMimeTypes,
    createReaderImageDataUrl,
    maxReaderImageBase64Length,
    normalizeReaderImageBase64,
};
