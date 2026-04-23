import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';

export interface SidebarData {
  circles: any[];
  tables: any[];
  elevators: any[];
  meetings: any[];
  pitches: any[];
  builds: any[];
  prompts: any[];
  standups: any[];
  meetups: any[];
  sprints: any[];
  magazines: any[];
  playlists: any[];
  episodes: any[];
  checklists: any[];
  moments: any[];
  allUsers: any[];
  sponsors: any[];
  mySponsorMemberships: any[];
  myCompanies: any[];
  myOwnedCompanies: any[];
  myMemberCompanies: any[];
  community: any | null;
  events: any[];
  programs: any[];
  courses: any[];
  markets: any[];
  loading: boolean;
  hasMarketVentures: boolean;
  documentCounts: { total: number; byCircle: Record<string, number> };
  eventCounts: { total: number; byCircle: Record<string, number> };
  reviewCounts: { total: number; byCircle: Record<string, number>; myReviews: number };
}

// ─── Column lists — only fetch what the sidebar actually renders ──────────────
//
// ContainerAccordion uses: id, name (or title), slug (or id for path)
// filterAdmin() uses: admin_ids
// membership filter uses: member_ids, created_by
// Circles additionally need: is_open_circle
// Programs additionally need: circle_id, facilitator_id
// Moments filter uses: user_id, is_public (not rendered in sidebar, just counted)
// Prompts getItemName = item.name || item.title, so need both

const BASE_COLS   = 'id, name, slug, admin_ids, member_ids, created_by';
const CIRCLE_COLS = 'id, name, slug, admin_ids, member_ids, created_by, is_open_circle';
const PROGRAM_COLS = 'id, name, slug, admin_ids, member_ids, created_by, circle_id, facilitator_id';
const PROMPT_COLS  = 'id, name, title, slug, admin_ids, member_ids, created_by';
const MOMENT_COLS  = 'id, name, slug, user_id, is_public';
// magazines/checklists use id as itemPathKey, but slug is still selected as a safe fallback
const MAG_CHKL_COLS = 'id, name, slug, admin_ids, member_ids, created_by';

export function useSidebarData(currentUserId: string) {
  const { profile } = useAuth();

  const [circles,              setCircles]              = useState<any[]>([]);
  const [tables,               setTables]               = useState<any[]>([]);
  const [elevators,            setElevators]            = useState<any[]>([]);
  const [meetings,             setMeetings]             = useState<any[]>([]);
  const [pitches,              setPitches]              = useState<any[]>([]);
  const [builds,               setBuilds]               = useState<any[]>([]);
  const [prompts,              setPrompts]              = useState<any[]>([]);
  const [standups,             setStandups]             = useState<any[]>([]);
  const [meetups,              setMeetups]              = useState<any[]>([]);
  const [sprints,              setSprints]              = useState<any[]>([]);
  const [magazines,            setMagazines]            = useState<any[]>([]);
  const [playlists,            setPlaylists]            = useState<any[]>([]);
  const [episodes,             setEpisodes]             = useState<any[]>([]);
  const [checklists,           setChecklists]           = useState<any[]>([]);
  const [moments,              setMoments]              = useState<any[]>([]);
  // allUsers is kept as an array for API compatibility but only populated
  // with count-derived stub objects — sidebar only uses allUsers.length
  const [allUsers,             setAllUsers]             = useState<any[]>([]);
  const [sponsors,             setSponsors]             = useState<any[]>([]);
  const [mySponsorMemberships, setMySponsorMemberships] = useState<any[]>([]);
  const [myCompanies,          setMyCompanies]          = useState<any[]>([]);
  const [myOwnedCompanies,     setMyOwnedCompanies]     = useState<any[]>([]);
  const [myMemberCompanies,    setMyMemberCompanies]    = useState<any[]>([]);
  const [community,            setCommunity]            = useState<any | null>(null);
  // events array kept for API compatibility; only .length is used by CalendarEventsSection
  const [events,               setEvents]               = useState<any[]>([]);
  const [programs,             setPrograms]             = useState<any[]>([]);
  const [courses,              setCourses]              = useState<any[]>([]);
  const [markets,              setMarkets]              = useState<any[]>([]);
  const [loading,              setLoading]              = useState(true);
  const [hasMarketVentures,    setHasMarketVentures]    = useState(false);
  const [documentCounts, setDocumentCounts] = useState<{ total: number; byCircle: Record<string, number> }>({ total: 0, byCircle: {} });
  const [eventCounts,    setEventCounts]    = useState<{ total: number; byCircle: Record<string, number> }>({ total: 0, byCircle: {} });
  const [reviewCounts,   setReviewCounts]   = useState<{ total: number; byCircle: Record<string, number>; myReviews: number }>({ total: 0, byCircle: {}, myReviews: 0 });

  // Debounce ref — prevents realtime bursts from firing 10 full refetches in a row
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || !currentUserId) return;

    const currentProfile = profile;
    let isFirstFetch = true;

    // ─── Core fetch ───────────────────────────────────────────────────────────

    const fetchData = async () => {
      try {
        if (isFirstFetch) setLoading(true);
        if (!currentProfile) return;

        const isPlatformAdmin = currentProfile.role === 'super';

        // Helper: fetch a container table with narrow column list
        const fetchContainer = async (
          table: string,
          cols: string,
          setter: (data: any[]) => void
        ) => {
          try {
            let query = supabase.from(table).select(cols);

            if (!isPlatformAdmin) {
              if (table === 'moments') {
                query = query.or(`user_id.eq.${currentUserId},is_public.eq.true`);
              } else if (table === 'episodes' || table === 'magazines' || table === 'checklists' || table === 'prompts') {
                query = query.eq('created_by', currentUserId);
              } else if (table === 'circles') {
                query = query.contains('member_ids', [currentUserId]);
              } else if (table === 'programs') {
                query = query.contains('member_ids', [currentUserId]);
              } else {
                query = query.or(`member_ids.cs.{${currentUserId}},admin_ids.cs.{${currentUserId}},created_by.eq.${currentUserId}`);
              }
            }

            if (table === 'programs') {
              query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;
            if (error) {
              if (['PGRST204', 'PGRST116', '42P01', 'PGRST205'].includes(error.code) || error.message?.includes('Failed to fetch')) {
                setter([]);
              } else {
                throw error;
              }
            } else {
              setter(data || []);
            }
          } catch (err: any) {
            if (['PGRST204', 'PGRST116', '42P01', 'PGRST205'].includes(err.code) || err.message?.includes('Failed to fetch')) {
              setter([]);
            } else {
              console.log(`Error fetching ${table}, skipping...`, err);
              setter([]);
            }
          }
        };

        // ── 1. Container tables — narrow selects, all parallel ────────────────
        await Promise.all([
          fetchContainer('circles',    CIRCLE_COLS,   setCircles),
          fetchContainer('tables',     BASE_COLS,     setTables),
          fetchContainer('elevators',  BASE_COLS,     setElevators),
          fetchContainer('meetings',   BASE_COLS,     setMeetings),
          fetchContainer('pitches',    BASE_COLS,     setPitches),
          fetchContainer('builds',     BASE_COLS,     setBuilds),
          fetchContainer('prompts',    PROMPT_COLS,   setPrompts),
          fetchContainer('standups',   BASE_COLS,     setStandups),
          fetchContainer('meetups',    BASE_COLS,     setMeetups),
          fetchContainer('sprints',    BASE_COLS,     setSprints),
          fetchContainer('magazines',  MAG_CHKL_COLS, setMagazines),
          fetchContainer('playlists',  BASE_COLS,     setPlaylists),
          fetchContainer('episodes',   BASE_COLS,     setEpisodes),
          fetchContainer('checklists', MAG_CHKL_COLS, setChecklists),
          fetchContainer('moments',    MOMENT_COLS,   setMoments),
          fetchContainer('programs',   PROGRAM_COLS,  setPrograms),
        ]);

        // ── 2. Courses — different field names ────────────────────────────────
        try {
          const isAdmin = currentProfile?.role ? hasRoleLevel(currentProfile.role, ROLES.ADMIN) : false;
          let coursesQuery = supabase
            .from('courses')
            .select('id, title, slug, instructor_id, created_by, is_published, enrollment_count')
            .order('created_at', { ascending: false });
          if (!isAdmin) {
            coursesQuery = coursesQuery.or(`instructor_id.eq.${currentUserId},created_by.eq.${currentUserId}`);
          }
          const { data: coursesData, error: coursesError } = await coursesQuery;
          if (coursesError) {
            if (['PGRST204', 'PGRST205', '42P01'].includes(coursesError.code)) {
              setCourses([]);
            } else throw coursesError;
          } else {
            setCourses(coursesData || []);
          }
        } catch {
          setCourses([]);
        }

        // ── 3. Events — count only (CalendarEventsSection only needs .length) ─
        try {
          const { count, error } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', currentProfile.community_id);
          if (!error && count != null) {
            // Populate a stub array sized to the count so existing consumers of
            // events.length continue to work without receiving full row data.
            setEvents(Array.from({ length: count }));
            setEventCounts({ total: count, byCircle: {} });
          }
        } catch {
          setEvents([]);
          setEventCounts({ total: 0, byCircle: {} });
        }

        // ── 4. Users — count only (sidebar only shows allUsers.length) ────────
        try {
          const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', currentProfile.community_id);
          if (!error && count != null) {
            // Stub array — callers only use .length
            setAllUsers(Array.from({ length: count }));
          }
        } catch {
          setAllUsers([]);
        }

        // ── 5. Sponsors ───────────────────────────────────────────────────────
        try {
          const { data, error } = await supabase
            .from('sponsors')
            .select('id, name, slug');
          if (error) throw error;
          setSponsors(data || []);
        } catch {
          setSponsors([]);
        }

        // ── 6. Sponsor memberships ────────────────────────────────────────────
        try {
          const { data } = await supabase
            .from('sponsor_members')
            .select('sponsor_id, role, sponsor:sponsors(id, name, slug, logo_url)')
            .eq('user_id', currentUserId);
          setMySponsorMemberships(data || []);
        } catch {
          setMySponsorMemberships([]);
        }

        // ── 7. Companies ──────────────────────────────────────────────────────
        try {
          const [{ data: ownedCompanies }, { data: memberOf }] = await Promise.all([
            supabase
              .from('market_companies')
              .select('id, name, slug, logo_url, owner_user_id')
              .eq('owner_user_id', currentUserId)
              .order('name'),
            supabase
              .from('company_members')
              .select('company:market_companies(id, name, slug, logo_url, owner_user_id)')
              .eq('user_id', currentUserId),
          ]);

          const memberCompanies = (memberOf || []).map((m: any) => m.company).filter(Boolean);
          const allIds = new Set((ownedCompanies || []).map((c: any) => c.id));
          const filteredMemberCompanies = memberCompanies.filter((c: any) => !allIds.has(c.id));
          const combined = [...(ownedCompanies || []), ...filteredMemberCompanies];
          setMyCompanies(combined);
          setMyOwnedCompanies(ownedCompanies || []);
          setMyMemberCompanies(filteredMemberCompanies);
        } catch {
          setMyCompanies([]);
          setMyOwnedCompanies([]);
          setMyMemberCompanies([]);
        }

        // ── 8. Community ──────────────────────────────────────────────────────
        try {
          const { data: communityData, error: communityError } = await supabase
            .from('communities')
            .select('id, name, slug, logo')
            .eq('id', currentProfile.community_id)
            .single();

          if (communityError) throw communityError;

          if (communityData) {
            setCommunity(communityData);
          } else {
            const { data: settingsData } = await supabase
              .from('platform_settings')
              .select('default_community_name')
              .single();
            setCommunity(settingsData?.default_community_name
              ? { id: currentProfile.community_id, name: settingsData.default_community_name, slug: 'default', logo: null }
              : null);
          }
        } catch {
          setCommunity(null);
        }

        // ── 9. Markets ────────────────────────────────────────────────────────
        try {
          const { data, error } = await supabase
            .from('markets')
            .select('id, name, slug, market_type, display_order, is_active')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
          if (error) {
            if (['PGRST204', 'PGRST205', '42P01'].includes(error.code)) setMarkets([]);
            else throw error;
          } else {
            setMarkets(data || []);
          }
        } catch {
          setMarkets([]);
        }

        // ── 10. Has market ventures ───────────────────────────────────────────
        try {
          const { count, error } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .or(`owner_id.eq.${currentUserId},admin_ids.cs.{${currentUserId}},member_ids.cs.{${currentUserId}}`);
          if (!error) setHasMarketVentures(!!count && count > 0);
        } catch {
          // ignore
        }

        // ── 11. Document count — HEAD only, no rows downloaded ───────────────
        try {
          const { count, error } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true });
          if (!error && count != null) {
            setDocumentCounts({ total: count, byCircle: {} });
          }
        } catch {
          // ignore
        }

        // ── 12. Review count — HEAD only ──────────────────────────────────────
        try {
          const [{ count: total }, { count: myCount }] = await Promise.all([
            supabase.from('reviews').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('author_id', currentUserId),
          ]);
          setReviewCounts({ total: total ?? 0, byCircle: {}, myReviews: myCount ?? 0 });
        } catch {
          // ignore
        }

      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setLoading(false);
        isFirstFetch = false;
      }
    };

    fetchData();

    // ─── Realtime — debounced so a burst of writes doesn't spam 25 refetches ─
    const debouncedRefetch = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        fetchData();
      }, 1000);
    };

    const channel = supabase
      .channel('sidebar_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circles'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables'     }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elevators'  }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings'   }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitches'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builds'     }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'standups'   }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetups'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'magazines'  }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists'  }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'episodes'   }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moments'    }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs'   }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses'    }, debouncedRefetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    };
  }, [profile?.id, currentUserId]);

  return {
    circles,
    tables,
    elevators,
    meetings,
    pitches,
    builds,
    prompts,
    standups,
    meetups,
    sprints,
    magazines,
    playlists,
    episodes,
    checklists,
    moments,
    allUsers,
    sponsors,
    mySponsorMemberships,
    myCompanies,
    myOwnedCompanies,
    myMemberCompanies,
    community,
    events,
    programs,
    courses,
    markets,
    loading,
    hasMarketVentures,
    documentCounts,
    eventCounts,
    reviewCounts,
  };
}
