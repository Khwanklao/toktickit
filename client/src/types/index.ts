export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string;
}

export type RequesterStatus = "idle" | "loading" | "success" | "error";
