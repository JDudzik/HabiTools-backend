exports.seed = (knex) => {
  return knex('event_messages').insert([
    // User 1
    {
      id: '00000001-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: '00000000-0000-4000-a000-000000000000',
      event_slug: 'normal-message',
      event_name: 'Normal Message',
      message_text: 'A simple regular message.',
      short_message: 'Normal message',
      should_notify: true,
      priority: 1, // Normal
      acknowledged: false,
    },
    {
      id: '00000002-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'system-error',
      event_name: 'System Error',
      message_text: 'A severe message',
      short_message: 'Severe message',
      should_notify: true,
      priority: 3, // Severe
      acknowledged: false,
    },
    {
      id: '00000003-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'data-update',
      event_name: 'Data Update',
      message_text: 'Data was updated successfully.',
      short_message: 'Update success',
      should_notify: false,
      priority: 1, // Normal
      acknowledged: true,
    },
    {
      id: '00000004-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'debug-log',
      event_name: 'Debug Log',
      message_text: 'Debugging information logged.',
      short_message: null,
      should_notify: false,
      priority: 0, // Debug
      acknowledged: true,
    },
    {
      id: '00000005-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'normal-message',
      event_name: 'Normal Message',
      message_text: 'A fairly regular message.',
      short_message: 'A regular message',
      should_notify: false,
      priority: 1, // Normal
      acknowledged: false,
    },
    {
      id: '00000006-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'very-large-message',
      event_name: 'Very Large Message',
      message_text: 'Lorem ipsum '.repeat(1000), // ~11,000 chars
      short_message: 'Very large message',
      should_notify: true,
      priority: 2, // High
      acknowledged: false,
    },
    {
      id: '00000007-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000001-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'markdown-showcase',
      event_name: 'Markdown Showcase',
      message_text: 
`
# Heading 1
## Heading 2
### Heading 3

**Bold text**, *italic text*, ~~strikethrough~~, \`inline code\`

> Blockquote

- Unordered list
  - Nested item
1. Ordered list
2. Second item

[Link to Google](https://google.com)

![Alt text](https://fastly.picsum.photos/id/430/200/200.jpg?hmac=RbYQ27bVLRKt5ScfTYiQ_ePoVdo70X4eWg2KPc6JF0I)

| Table | Example |
|-------|---------|
| Cell1 | Cell2   |

\`\`\`js
console.log("Code block");
\`\`\`

<u>HTML underline</u>

---

Above is a **horizontal line** separator.
`,
      short_message: 'Markdown formatting showcase',
      should_notify: true,
      priority: 1, // Normal
      acknowledged: false,
    },

    // User 2
    {
      id: '00000008-0012-4000-a000-000000000000',
      created_at: Date.now(),
      user_id: '00000002-0001-4000-a000-000000000000',
      resource_id: null,
      event_slug: 'normal-message',
      event_name: 'Normal Message',
      message_text: 'This belongs to a different user',
      short_message: 'Normal for diff user.',
      should_notify: false,
      priority: 1, // Normal
      acknowledged: false,
    },
  ]);
};