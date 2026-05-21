'use server';

import { updateLeadStatus, getLeads } from '@/lib/lead-service';
import { revalidatePath } from 'next/cache';

export async function setLeadStatusAction(id: string, newStatus: string) {
  try {
    await updateLeadStatus(id, newStatus);
    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update status' };
  }
}
