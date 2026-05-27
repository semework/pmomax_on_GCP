import JSZip from 'jszip';
export async function exportWordAndGanttZip(wordBlob, ganttDataUrl, baseName = 'PMOMax_PID') {
    const zip = new JSZip();
    zip.file(`${baseName}.docx`, wordBlob);
    // Convert Gantt data URL to Blob (robust fallback)
    let ganttBlob;
    try {
        const res = await fetch(ganttDataUrl);
        ganttBlob = await res.blob();
    }
    catch (_a) {
        // fallback: decode base64
        const ganttBase64 = ganttDataUrl.split(',')[1];
        const binary = atob(ganttBase64);
        const buf = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
            buf[i] = binary.charCodeAt(i);
        ganttBlob = new Blob([buf], { type: 'image/png' });
    }
    zip.file(`${baseName}_Gantt.png`, ganttBlob);
    // Generate ZIP and trigger download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_Export.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2500);
    }
    return zipBlob;
}
