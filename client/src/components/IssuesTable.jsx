import { Link } from 'react-router-dom'
import { priorityLabel, statusLabel } from '../constants/issueEnums'
import { formatIssueKey, priorityTone, statusColumnColor } from '../utils/issueDisplay'
import IssueLabelChips from './IssueLabelChips'
/**
 * @param {object} props
 * @param {Array<object>} props.issues
 * @param {(issue: object) => string} props.hrefForIssue
 * @param {boolean} [props.showProject]
 */
export default function IssuesTable({ issues, hrefForIssue, showProject = false }) {
  if (!issues.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d2f5fa]/15 bg-[#171c1d]/40 px-6 py-14 text-center text-sm text-gray-500">
        No issues match the current search or filters.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#d2f5fa]/10 bg-[#0b1117]/50 shadow-lg shadow-black/20">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#d2f5fa]/10 text-[10px] uppercase tracking-wider text-gray-500 bg-[#171c1d]/80">
            <th className="px-4 py-3 font-semibold">Key</th>
            {showProject ? <th className="px-4 py-3 font-semibold">Project</th> : null}
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Labels</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d2f5fa]/8">
          {issues.map((issue) => (
            <tr
              key={issue.issue_id}
              className="hover:bg-[#78e5ef]/[0.04] transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  to={hrefForIssue(issue)}
                  className="font-mono text-xs text-[#78e5ef] hover:text-[#9eedf3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
                >
                  {formatIssueKey(issue.issue_id)}
                </Link>
              </td>
              {showProject ? (
                <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate" title={issue.project_name}>
                  {issue.project_name ?? '—'}
                </td>
              ) : null}
              <td className="px-4 py-3">
                <Link
                  to={hrefForIssue(issue)}
                  className="text-gray-100 font-medium hover:text-white line-clamp-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78e5ef]/40 rounded"
                >
                  {issue.title}
                </Link>
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                <IssueLabelChips labels={issue.labels || []} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColumnColor(issue.status)}`} aria-hidden />
                  {statusLabel(issue.status)}
                </span>
              </td>
              <td className={`px-4 py-3 text-xs font-semibold uppercase ${priorityTone(issue.priority)}`}>
                {priorityLabel(issue.priority)}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 capitalize">{issue.type}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{issue.assigned_to_username ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
