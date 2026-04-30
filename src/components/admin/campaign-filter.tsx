"use client";

interface Props {
  campaigns: { id: string; name: string }[];
  selected?: string;
  baseUrl: string;
  extraParams?: string;
}

export function CampaignFilter({ campaigns, selected, baseUrl, extraParams = "" }: Props) {
  return (
    <select
      className="input-base text-xs py-1 max-w-[200px]"
      defaultValue={selected ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        const params = val ? `campaignId=${val}${extraParams ? `&${extraParams}` : ""}` : extraParams;
        window.location.href = `${baseUrl}${params ? `?${params}` : ""}`;
      }}
    >
      <option value="">All Campaigns</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
