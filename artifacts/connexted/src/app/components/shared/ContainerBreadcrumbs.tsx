import { Link } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { Home, FolderKanban } from 'lucide-react';
import { useContainerProgramContext } from '@/hooks/useContainerProgramContext';

interface ContainerBreadcrumbsProps {
  containerType: string; // e.g., 'Builds', 'Elevators'
  containerName: string;
  containerListPath: string; // e.g., '/builds'
  programId?: string | null;
  journeyId?: string | null;
}

export function ContainerBreadcrumbs({
  containerType,
  containerName,
  containerListPath,
  programId,
  journeyId,
}: ContainerBreadcrumbsProps) {
  const { program, journey, loading } = useContainerProgramContext(programId, journeyId);

  if (loading) {
    return null; // Or a skeleton loader
  }

  // If part of a program, show: Home > My Programs > Program Name > Journey Title > Container Name
  // If not part of a program, show: Home > Container Type > Container Name
  
  if (program) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/home" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/my-programs" className="flex items-center gap-1">
                <FolderKanban className="w-4 h-4" />
                My Programs
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/programs/${program.slug}`}>
                {program.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {journey && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{journey.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{containerName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Default breadcrumb without program
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/home" className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={containerListPath}>
              {containerType}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{containerName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}