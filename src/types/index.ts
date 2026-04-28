export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Photo {
  id: string;
  imageUrl: string;
  createdAt: number;
  senderId: string;
}
