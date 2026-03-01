import { SavedWorkspacePage } from "@/components/saved/SavedWorkspacePage";

type SavedPageProps = {
  searchParams?: {
    workspace?: string;
  };
};

export default function SavedPage({ searchParams }: SavedPageProps) {
  return <SavedWorkspacePage initialWorkspace={searchParams?.workspace ?? ""} />;
}
