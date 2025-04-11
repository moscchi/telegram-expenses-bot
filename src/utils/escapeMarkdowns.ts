export function escapeMarkdown(text: string) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (match) => '\\' + match);
  }
  