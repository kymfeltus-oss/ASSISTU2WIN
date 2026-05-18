import { PlaceholderScreen } from "@/components/dashboard/PlaceholderScreen";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MilestoneDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaceholderScreen title={`Milestone ${id}`} />;
}
