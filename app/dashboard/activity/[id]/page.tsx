import { PlaceholderScreen } from "@/components/dashboard/PlaceholderScreen";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaceholderScreen title={`Activity ${id}`} />;
}
