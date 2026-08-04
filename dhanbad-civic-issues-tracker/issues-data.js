// Mock civic issues for the Dhanbad dashboard MVP.
// This file intentionally exposes a global array so the app can run without a build step.

window.issuesData = [
  {
    id: "1",
    title: "Dirty Bar Association",
    description: "Bar Association of Dhanbad is not maintaining cleanliness in the area.",
    category: "Infrastructure",
    latitude: 23.797749,
    longitude: 86.43537,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/infrastructure/barassociation_pic.png", alt: "Dirty Bar Association" },
      { type: "video", url: "./mock_media/infrastructure/barassociation_video.mp4", poster: "./mock_media/infrastructure/barassociation_pic.png" }
    ]
  },
  {
    id: "2",
    title: "Smelly toilet",
    description: "Smelly toilet at Vivekananda Chowk.",
    category: "Sanitation",
    latitude: 23.799116,
    longitude: 86.440719,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/sanitation/toilet_1.png", alt: "Smelly toilet" },
      { type: "video", url: "./mock_media/sanitation/toilet_1.mp4", poster: "./mock_media/sanitation/toilet_1.png" }
    ]
  },
  {
    id: "3",
    title: "Open dumping in Chirkunda",
    description: "Open dumping is occurring in Chirkunda, Municipality is not managing waste bin.",
    category: "Sanitation",
    latitude: 23.7479,
    longitude: 86.7869,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/sanitation/chirkunda_garbage_pic.png", alt: "Open dumping in Chirkunda" },
      { type: "video", url: "./mock_media/sanitation/chirkunda_garbage_video.mp4", poster: "./mock_media/sanitation/chirkunda_garbage_pic.png" }
    ]
  },
  {
    id: "4",
    title: "Waterlogging near pond",
    description: "Pond water is getting waterlogged, causing diseases.",
    category: "Sanitation",
    latitude: 23.776306,
    longitude: 86.235694,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/sanitation/bishnupur_village_pic.png", alt: "Waterlogging near pond" },
      { type: "video", url: "./mock_media/sanitation/bishnupur_village.mp4", poster: "./mock_media/sanitation/bishnupur_village_pic.png" }
    ]
  },
  {
    id: "5",
    title: "Broken school roof.",
    description: "The roof of the local school is dangerously damaged and needs repair.",
    category: "Infrastructure",
    latitude: 23.84768060049324,
    longitude: 86.61440567527467,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/infrastructure/school_pic.png", alt: "Broken school roof" },
      { type: "video", url: "./mock_media/infrastructure/school_video.mp4", poster: "./mock_media/infrastructure/school_pic.png" }
    ]
  },
  {
    id: "6",
    title: "Uncollected waste on roadside.",
    description: "Uncollected waste on roadside near Heera Palace.",
    category: "Infrastructure",
    latitude: 23.799001,
    longitude: 86.441390,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/infrastructure/heerapalace_1.jpg", alt: "Uncollected waste on roadside" },
      { type: "image", url: "./mock_media/infrastructure/heerapalace_2.jpg", alt: "Uncollected waste on roadside" },
      { type: "image", url: "./mock_media/infrastructure/heerapalace_3.jpg", alt: "Uncollected waste on roadside" },
      { type: "image", url: "./mock_media/infrastructure/heerapalace_4.jpg", alt: "Uncollected waste on roadside" }
    ]
  },
  {
    id: "7",
    title: "Waterlogging on road",
    description: "Waterlogging is occurring on the main road under bridge.",
    category: "Drainage",
    latitude: 23.814690,
    longitude: 86.342811,
    status: "Unresolved",
    media: [
      { type: "image", url: "./mock_media/drainage/waterlogging_pic.jpg", alt: "Waterlogging on road" },
      { type: "video", url: "./mock_media/drainage/waterlogging_video.mp4", poster: "./mock_media/drainage/waterlogging_pic.jpg" }
    ]
  },
  {
    id: "8",
    title: "Road unclean",
    description: "The main road is unclean and needs to be cleaned.",
    category: "Infrastructure",
    latitude: 23.800116,
    longitude: 86.450719,
    status: "In Progress",
    media: [
      { type: "image", url: "./mock_media/completed/inprogress.jpg", alt: "Road unclean" },
    ]
  },
  {
    id: "9",
    title: "Road unclean",
    description: "The main road is unclean and needs to be cleaned.",
    category: "Infrastructure",
    latitude: 23.801116,
    longitude: 86.453719,
    status: "Completed",
    media: [
      { type: "image", url: "./mock_media/completed/completed.jpg", alt: "Road unclean" },
    ]
  }
];
