import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { NewMessageForm } from './NewMessageForm';
import MessagesList from './MessagesList';
import { prisma } from '@/lib/prisma';

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const messages = user.companyId
    ? await prisma.message.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { toAll: true },
            { toRoles: { has: user.role } },
            ...(user.positionId ? [{ toPositions: { has: user.positionId } }] : []),
            { toUserIds: { has: user.id } },
          ],
        },
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          text: true,
          fileUrl: true,
          sentAt: true,
          fromId: true,
          from: { select: { name: true, email: true } },
          readBy: { select: { id: true } },
        },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Messages</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Messages</h1>
          <p className="text-sm text-zinc-600">See messages sent to you and broadcast to the team.</p>
        </div>
        <NewMessageForm userRole={user.role} />
        <MessagesList messages={messages} currentUserId={user.id} />
      </div>
    </div>
  );
}
