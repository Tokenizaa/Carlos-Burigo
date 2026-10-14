import type {
  PublicDemandDto,
  DemandMessageDto,
  DemandHistoryDto,
} from '../../src/contracts/publicDemand';

export function mapToPublicDemandDto(row: any): PublicDemandDto {
  return {
    id: row.id,
    protocol: row.protocol,
    title: row.subject || row.title || '',
    description: row.description || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapToPublicDemandMessageDto(row: any): DemandMessageDto {
  return {
    id: row.id,
    demandId: row.demand_id || row.demandId,
    message: row.text || row.message,
    sender: row.sender_name || row.sender,
    createdAt: row.created_at,
  };
}

export function mapToPublicDemandHistoryDto(row: any): DemandHistoryDto {
  return {
    id: row.id,
    demandId: row.demand_id || row.demandId,
    status: row.new_status || row.status,
    note: row.note,
    changedAt: row.timestamp || row.created_at,
  };
}
