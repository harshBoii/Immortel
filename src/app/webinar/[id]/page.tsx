import WebinarExperience from './WebinarExperience';

type WebinarPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function WebinarPage({ params, searchParams }: WebinarPageProps) {
  const [{ id }, resolvedSearch] = await Promise.all([params, searchParams]);

  const rawOffset = resolvedSearch?.offset;
  const offsetValue = Array.isArray(rawOffset) ? rawOffset[0] : rawOffset;
  const parsedOffset = offsetValue ? Number(offsetValue) : 0;
  const initialOffsetSeconds =
    Number.isFinite(parsedOffset) && !Number.isNaN(parsedOffset) ? Math.max(0, parsedOffset) : 0;

  return <WebinarExperience webinarId={id} initialOffsetSeconds={initialOffsetSeconds} />;
}


