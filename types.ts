
export interface QAItem {
  id: number;
  question: string;
  answer: string;
}

export enum AppMode {
  Learn = 'learn',
  Study = 'study',
}
