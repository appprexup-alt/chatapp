import { Lead, Client } from '../types';

/**
 * Replaces placeholders in the text with values from the Lead or Client object.
 * Supported placeholders:
 * - {{Nombre}}: Name
 * - {{Telefono}}: Phone number
 * - {{Email}}: Email
 * - {{Empresa}}: Organization name (if available)
 * 
 * @param text The text containing placeholders
 * @param data The lead or client object containing the data
 * @returns The text with placeholders replaced
 */
export const replaceVariables = (text: string, data: Lead | Client | null | undefined): string => {
    if (!text || !data) return text;

    let processedText = text;

    // {{Nombre}} - Try to be smart about first name vs full name if needed, 
    // but for now let's just use the full name as it's the safest default
    // or maybe split by space for a more casual "Hi [First Name]" feel?
    // Let's stick to full name replacement for {{Nombre}} as per request, 
    // but typically users might want just the first name. 
    // The user asked for "Nombre registered", so lead.name is appropriate.
    processedText = processedText.replace(/{{Nombre}}/g, data.name || '');

    // {{Telefono}}
    processedText = processedText.replace(/{{Telefono}}/g, data.phone || '');

    // {{Email}}
    processedText = processedText.replace(/{{Email}}/g, data.email || '');

    return processedText;
};

/**
 * Inserts a text variable into the input/textarea at the current cursor position.
 * 
 * @param variable The variable string to insert (e.g., "{{Nombre}}")
 * @param inputElement The DOM element (input or textarea)
 * @param setTextSetter The state setter function for the text value
 */
export const insertVariableAtCursor = (
    variable: string,
    inputElement: HTMLInputElement | HTMLTextAreaElement | null,
    setTextSetter: (text: string) => void
) => {
    if (!inputElement) return;

    const start = inputElement.selectionStart;
    const end = inputElement.selectionEnd;
    const text = inputElement.value;

    if (start === null || end === null) {
        setTextSetter(text + variable);
        return;
    }

    const newText = text.substring(0, start) + variable + text.substring(end);
    setTextSetter(newText);

    // Restore focus and cursor position (need to defer slightly for React state update)
    setTimeout(() => {
        inputElement.focus();
        inputElement.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
};
