import Breadcrumbs from '@/app/components/Breadcrumbs';
import BatchContainerDelete from '@/app/components/admin/BatchContainerDelete';

export default function BatchContainerDeletePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Batch Delete' }
      ]} />
      
      <BatchContainerDelete />
    </div>
  );
}
