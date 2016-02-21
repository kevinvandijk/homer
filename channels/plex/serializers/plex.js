import { pick, isArray } from 'lodash';

function serialize(mediaItem) {
  const attributes = pick(mediaItem, ['key', 'title', 'tagline', 'duration', 'viewOffset']);
  return {
    id: mediaItem.ratingKey,
    type: mediaItem.type,
    attributes
  };
}

export default function serializer(data) {
  return (isArray(data)
    ? data.map(serialize)
    : serialize(data)
  );
}
