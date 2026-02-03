// Shared embed snippet generator for scheduling widget
type EmbedSnippetOptions = {
  userId: string;
  meetingTypes?: string[];
  baseUrl?: string;
};

export function getEmbedSnippet({ userId, meetingTypes = ['phone', 'video', 'inperson'], baseUrl }: EmbedSnippetOptions) {
  const dataTypeValue = meetingTypes.length > 0 ? meetingTypes.join(',') : 'phone,video,inperson';
  return `<script src="${baseUrl || process.env.NEXT_PUBLIC_URL || 'https://clientwave-scheduling.vercel.app'}/embed.js" data-user-id="${userId}" data-type="${dataTypeValue}"></script>\n<div id="clientwave-scheduler"></div>`;
}
