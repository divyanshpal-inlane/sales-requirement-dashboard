import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PREP_GAMES } from "@/constants/prepGames";
import { useCurrentAdmin } from "@/queries/adminPermissions";
import { fetchGameAnalytics } from "@/queries/gameAnalytics";
import { useCurrentUser } from "@/queries/userManagement";

const dateLabel = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function GameAnalytics() {
  const { data: admin, isLoading: adminLoading } = useCurrentAdmin();
  const { data: member, isLoading: memberLoading } = useCurrentUser();
  const allowed = member
    ? member.permissions.includes("game_analytics")
    : !!(
        admin?.is_super_admin || admin?.permissions.includes("game_analytics")
      );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("");
  const [activity, setActivity] = useState("all");
  const [page, setPage] = useState(0);
  const report = useQuery({
    queryKey: [
      "gameAnalytics",
      admin?.id,
      member?.id,
      search,
      game,
      activity,
      page,
    ],
    queryFn: () => fetchGameAnalytics(search, game, activity, page),
    enabled: allowed && !adminLoading && !memberLoading,
    retry: false,
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Button asChild variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Game Analytics</h1>
          <p className="text-sm text-gray-600">
            Opening counts record Play now clicks in Prep, not confirmed game
            loads or completions. No recorded activity does not mean a learner
            never played before tracking began.
          </p>
          <p className="text-sm text-gray-600">
            Active viewing time is unavailable until the game websites support
            activity tracking.
          </p>
          {report.data && (
            <p className="text-sm">
              Tracking enabled: {dateLabel(report.data.tracking_since)}. All
              recorded activity is included.
            </p>
          )}
        </header>
        {adminLoading || memberLoading ? (
          <p role="status">Checking access…</p>
        ) : !allowed ? (
          <p role="alert">
            You need the Game Analytics permission to view this report.
          </p>
        ) : (
          <>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setPage(0);
              }}
            >
              <label className="grid gap-1 text-sm" htmlFor="game-search">
                Learner name or permitted phone number
                <Input
                  id="game-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search learners"
                />
              </label>
              <Button type="submit">Search</Button>
              <label className="grid gap-1 text-sm" htmlFor="game-filter">
                Game
                <select
                  id="game-filter"
                  className="h-10 rounded-md border bg-white px-3"
                  value={game}
                  onChange={(event) => {
                    setGame(event.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All games</option>
                  {PREP_GAMES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title.replace(/:$/, "")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm" htmlFor="activity-filter">
                Activity
                <select
                  id="activity-filter"
                  className="h-10 rounded-md border bg-white px-3"
                  value={activity}
                  onChange={(event) => {
                    setActivity(event.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All activity</option>
                  <option value="opened">Recorded openings</option>
                  <option value="unrecorded">No recorded activity</option>
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={report.isFetching}
                onClick={() => void report.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </form>
            {report.isPending ? (
              <p role="status">Loading game activity…</p>
            ) : report.isError ? (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800"
              >
                Unable to load game analytics. Check your access and that the
                game analytics database migration has been applied, then
                refresh.
              </p>
            ) : (
              report.data && (
                <>
                  <p className="text-sm text-gray-600">
                    {report.data.total_rows} learner–game records match these
                    filters.
                  </p>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">
                        Learner game launch history
                      </caption>
                      <thead className="bg-gray-100">
                        <tr>
                          {[
                            "Learner",
                            "Phone",
                            "Game",
                            "Openings",
                            "First opened",
                            "Last opened",
                            "Viewing time",
                          ].map((label) => (
                            <th
                              key={label}
                              scope="col"
                              className="whitespace-nowrap p-3"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.data.rows.map((row) => (
                          <tr
                            key={`${row.learner_id}-${row.game_id}`}
                            className="border-t"
                          >
                            <td className="p-3">
                              {row.name || "Unnamed learner"}
                            </td>
                            <td className="whitespace-nowrap p-3">
                              {row.phone}
                            </td>
                            <td className="p-3">
                              {PREP_GAMES.find(
                                (item) => item.id === row.game_id,
                              )?.title.replace(/:$/, "")}
                            </td>
                            <td className="p-3">
                              {row.opens > 0
                                ? row.opens
                                : "No recorded activity"}
                            </td>
                            <td className="whitespace-nowrap p-3">
                              {dateLabel(row.first_opened_at)}
                            </td>
                            <td className="whitespace-nowrap p-3">
                              {dateLabel(row.last_opened_at)}
                            </td>
                            <td className="p-3 text-gray-500">Unavailable</td>
                          </tr>
                        ))}
                        {report.data.rows.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-8 text-center text-gray-500"
                            >
                              No learners match these filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <nav
                    aria-label="Report pages"
                    className="flex items-center gap-3"
                  >
                    <Button
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page + 1} of{" "}
                      {Math.max(1, Math.ceil(report.data.total_rows / 50))}
                    </span>
                    <Button
                      variant="outline"
                      disabled={(page + 1) * 50 >= report.data.total_rows}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </nav>
                </>
              )
            )}
          </>
        )}
      </div>
    </main>
  );
}
