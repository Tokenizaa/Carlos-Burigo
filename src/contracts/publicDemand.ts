export interface PublicDemandDto {
  id: string;
  protocol: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DemandMessageDto {
  id: string;
  demandId: string;
  message: string;
  sender: string;
  createdAt: string;
}

export interface DemandHistoryDto {
  id: string;
  demandId: string;
  status: string;
  note?: string;
  changedAt: string;
}
