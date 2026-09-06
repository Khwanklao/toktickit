import { apiClient } from "./lib/apiClient.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface Attachment {
  id: number;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    email: string;
  };
  category: Category;
  relatedSystem: RelatedSystem;
  attachments: Attachment[];
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }
    const categoriesRes = await fetch(`${API_URL}/api/categories`);
    if (!categoriesRes.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }
    const categories = (await categoriesRes.json()) as Category[];
    return { online: true, categories };
  } catch (error) {
    if (error instanceof Error && error.message !== "Unable to connect to TokTickIT API") {
      throw new Error("Unable to connect to TokTickIT API");
    }
    throw error;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>("/api/categories");
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  return apiClient.get<RelatedSystem[]>("/api/related-systems");
}

export async function createTicket(payload: CreateTicketPayload): Promise<CreatedTicket> {
  return apiClient.post<CreatedTicket>("/api/tickets", payload);
}

export async function fetchTicketDetail(id: number | string): Promise<TicketDetail> {
  return apiClient.get<TicketDetail>(`/api/tickets/${id}`);
}

export async function uploadAttachment(ticketId: number | string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<Attachment>(`/api/tickets/${ticketId}/attachments`, formData);
}

export async function softRemoveAttachment(attachmentId: number | string, reason: string): Promise<Attachment> {
  return apiClient.delete<Attachment>(`/api/attachments/${attachmentId}`, { reason });
}
