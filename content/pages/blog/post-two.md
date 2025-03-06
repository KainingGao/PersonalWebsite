---
type: PostLayout
title: How to Commit to GitHub with Custom Dates
colors: colors-a
date: '2025-02-12'
author: content/data/team/doris-soto.json
excerpt: >-
  Learn how to use Git's environment variables to create commits with custom timestamps for legitimate use cases like code migration or project reconstruction.
featuredImage:
  type: ImageBlock
  url: /images/featured-Image3.jpg
  altText: Git commit timestamps
bottomSections:
  - elementId: ''
    type: RecentPostsSection
    colors: colors-f
    variant: variant-d
    subtitle: Recent posts
    showDate: true
    showAuthor: false
    showExcerpt: true
    recentCount: 2
    styles:
      self:
        height: auto
        width: wide
        margin:
          - mt-0
          - mb-0
          - ml-0
          - mr-0
        padding:
          - pt-12
          - pb-56
          - pr-4
          - pl-4
        justifyContent: center
      title:
        textAlign: left
      subtitle:
        textAlign: left
      actions:
        justifyContent: center
    showFeaturedImage: true
    showReadMoreLink: true
  - type: ContactSection
    backgroundSize: full
    title: 'Subscribe for more dev tips ✍️'
    colors: colors-f
    form:
      type: FormBlock
      elementId: sign-up-form
      fields:
        - name: firstName
          label: First Name
          hideLabel: true
          placeholder: First Name
          isRequired: true
          width: 1/2
          type: TextFormControl
        - name: lastName
          label: Last Name
          hideLabel: true
          placeholder: Last Name
          isRequired: false
          width: 1/2
          type: TextFormControl
        - name: email
          label: Email
          hideLabel: true
          placeholder: Email
          isRequired: true
          width: full
          type: EmailFormControl
        - name: updatesConsent
          label: Send me tutorial updates
          isRequired: false
          width: full
          type: CheckboxFormControl
      submitLabel: "Subscribe 🚀"
      styles:
        submitLabel:
          textAlign: center
    styles:
      self:
        height: auto
        width: narrow
        margin:
          - mt-0
          - mb-0
          - ml-4
          - mr-4
        padding:
          - pt-24
          - pb-24
          - pr-4
          - pl-4
        alignItems: center
        justifyContent: center
        flexDirection: row
      title:
        textAlign: left
      text:
        textAlign: left
---

# How to Commit to GitHub with Custom Dates

Git is a powerful version control system that records when your commits occurred. By default, it uses the current system time when creating a commit. However, there are legitimate scenarios where you might need to create commits with custom timestamps – for example, when migrating code from another system, reconstructing project history, or creating educational demonstrations.

In this post, I'll explain how to create Git commits with custom dates using Git's environment variables. This is not about deceiving others about your work timeline, but rather about properly preserving the true creation dates of your work when bringing it into Git.

## Why Would You Need Custom Commit Dates?

Before we dive into the how, let's discuss some legitimate reasons to use custom dates:

1. **Code Migration**: When migrating from another version control system to Git, you might want to preserve the original timestamps
2. **Restoring Lost History**: Reconstructing a repository after data loss
3. **Educational Purposes**: Creating a realistic commit timeline for tutorials or teaching
4. **Portfolio Building**: Accurately showing when you actually worked on projects when adding them to Git later

## Understanding Git's Date Variables

Git actually maintains two different timestamps for each commit:

1. **Author Date** (`GIT_AUTHOR_DATE`): When the changes were originally written
2. **Committer Date** (`GIT_COMMITTER_DATE`): When the changes were committed to the repository

Normally these are identical, but they can be different in scenarios like applying a patch from someone else or rebasing.

## How to Set Custom Dates in Git

The simplest way to create a commit with a custom date is to use Git's environment variables. Here's how:

```bash
# Format: YYYY-MM-DD HH:MM:SS
GIT_AUTHOR_DATE="2024-01-15 14:30:00" GIT_COMMITTER_DATE="2024-01-15 14:30:00" git commit -m "Your commit message"
```

You can also set these environment variables for an entire shell session:

```bash
export GIT_AUTHOR_DATE="2024-01-15 14:30:00"
export GIT_COMMITTER_DATE="2024-01-15 14:30:00"
git commit -m "Your commit message"
```

For ISO 8601 format with timezone:

```bash
GIT_AUTHOR_DATE="2024-01-15T14:30:00+0000" GIT_COMMITTER_DATE="2024-01-15T14:30:00+0000" git commit -m "Your commit message"
```

## Creating Custom Date Commits Programmatically

For more complex scenarios like migrating an entire project history or creating multiple commits with different dates, you can automate the process with a script. Using a language like JavaScript with Node.js, you can:

1. Generate dates programmatically
2. Create temporary environment variables for each commit
3. Execute Git commands with these variables

Here's a simplified approach for creating commits with custom dates programmatically:

```javascript
// Using simple-git library and child_process
async function commitWithCustomDate(files, message, dateString) {
  const env = {
    ...process.env,
    GIT_AUTHOR_DATE: dateString,
    GIT_COMMITTER_DATE: dateString
  };
  
  await git.add(files);
  
  // Execute git commit with custom environment variables
  return new Promise((resolve, reject) => {
    exec(`git commit -m "${message}"`, { env }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
```

## Best Practices and Ethical Considerations

While the ability to set custom dates is useful, it's important to use this feature ethically:

1. **Be transparent**: If you're backdating commits, mention this in the repository README or documentation
2. **Use accurate dates**: If you're migrating code, use the actual dates when the code was written
3. **Don't manipulate dates to deceive**: Never backdate commits to falsely claim you completed work earlier than you did
4. **Consider signing commits**: This adds a layer of verification to your repository

## Automatically Distributing Commits Over Time

For educational or demonstration purposes, you might want to distribute commits over a specific time period. This could help in:

- Creating a realistic-looking project history
- Demonstrating continuous development patterns
- Setting up example repositories with natural-looking commit patterns

To do this programmatically, you could:

1. Define a date range for your commits
2. Divide your content into logical segments
3. Distribute these segments across the date range
4. Create commits for each segment with appropriate dates

## Conclusion

Setting custom dates for Git commits is straightforward using Git's environment variables. Whether you're preserving the accurate history of migrated code or creating educational examples, understanding how to manipulate commit dates can be a useful addition to your Git toolkit.

Remember to use this capability responsibly and transparently. When used for legitimate purposes, custom commit dates help maintain the integrity and accuracy of your project's history.

Have you ever needed to set custom dates for your Git commits? What was your use case? Let me know in the comments!

---

*Disclaimer: Always follow your organization's policies and ethical guidelines when using these techniques. Many organizations value transparency in their development history.*