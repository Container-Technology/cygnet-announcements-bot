export const announcementsByStatusAndID = '*[_type == "announcement"  && !(_id in path("drafts.**")) && isPosted == $isPosted && time <= $currentTime]';
export const instanceByID = '*[_type == "instance" && !(_id in path("drafts.**")) && _id == $id] {id, title, subdomain, discordGuildId, highlightColor, smallLogo{asset->{url}}}';
