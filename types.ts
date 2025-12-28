
export interface Participant {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignments: { [participantId: string]: number }; // Mapping participant ID to quantity consumed
}

export interface Bill {
  id: string; // or number, keeping consistent with usage
  name: string; // establishment
  date: string;
  total: number;
  items: BillItem[];
  participants: Participant[];
  tax: number;
  tip: number;
  status: 'paid' | 'pending' | 'overdue';
  share: number; // User's share
  image?: string; // Base64 string of the receipt
}

export enum AppRoute {
  LANDING = '/',
  UPLOAD = '/upload',
  REVIEW = '/review',
  HISTORY = '/history'
}
