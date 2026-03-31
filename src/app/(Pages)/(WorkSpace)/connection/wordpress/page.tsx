import { Suspense } from 'react';
import LoadingAnimation from '@/app/components/animations/loading';
import { ConnectionWordPressClient } from './wordpress-client';

export default function ConnectionWordPressPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto min-h-[50vh] px-6 pb-6 pt-2">
          <LoadingAnimation text={`Jus A Sec...`} />
        </div>
      }
    >
      <ConnectionWordPressClient />
    </Suspense>
  );
}

