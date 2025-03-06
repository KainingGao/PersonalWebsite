---
type: PageLayout
title: About
colors: colors-a
backgroundImage:
  type: BackgroundImage
  url: /images/bg4.jpg
  backgroundSize: cover
  backgroundPosition: center
  backgroundRepeat: no-repeat
  opacity: 75
sections:
  - elementId: ''
    colors: colors-f
    backgroundSize: full
    text: >-
      ## Hi, I'm Kaining Gao

      I'm a Computer Science student at Iowa State University (expected graduation: May 2026). 
      Currently working as a Research Assistant at ISU's NextGen PPT Lab, where I develop tools 
      for 3D hand model measurement and analysis. I'm passionate about full-stack web development, 
      with experience in React, Next.js, Java Spring Boot, and more.
    media:
      type: ImageBlock
      url: /images/about.jpg
      altText: Kaining Gao profile image
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
          - pt-16
          - pb-12
          - pl-4
          - pr-4
        justifyContent: center
      title:
        textAlign: left
      subtitle:
        textAlign: left
      text:
        textAlign: left
      actions:
        justifyContent: flex-start
    type: HeroSection
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: MediaGallerySection
    colors: colors-f
    subtitle: 'Experience with these technologies:'
    images:
      - type: ImageBlock
        url: /images/react-logo.svg
        altText: React
        caption: React
      - type: ImageBlock
        url: /images/next-logo.svg
        altText: Next.js
        caption: Next.js
      - type: ImageBlock
        url: /images/java-logo.svg
        altText: Java
        caption: Java
      - type: ImageBlock
        url: /images/python-logo.svg
        altText: Python
        caption: Python
      - type: ImageBlock
        url: /images/mysql-logo.svg
        altText: MySQL
        caption: MySQL
    spacing: 3
    columns: 5
    aspectRatio: auto
    showCaption: false
    enableHover: false
    styles:
      self:
        width: wide
        height: auto
        padding:
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderRadius: none
        borderWidth: 0
        borderStyle: none
        borderColor: border-dark
      title:
        textAlign: left
      subtitle:
        textAlign: left
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: FeaturedItemsSection
    colors: colors-f
    items:
      - type: FeaturedItem
        actions:
          - type: Link
            label: GitHub
            url: 'https://github.com/KainingGao'
        styles:
          self:
            textAlign: left
      - type: FeaturedItem
        actions:
          - type: Link
            label: LinkedIn
            url: 'https://linkedin.com/in/kaining-gao'
        styles:
          self:
            textAlign: left
      - type: FeaturedItem
        actions:
          - type: Link
            label: Email
            url: 'mailto:gaokaining22@gmail.com'
        styles:
          self:
            textAlign: left
    columns: 3
    spacingX: 120
    spacingY: 0
    styles:
      self:
        height: auto
        width: wide
        padding:
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderRadius: none
        borderWidth: 0
        borderStyle: none
        borderColor: border-dark
      title:
        textAlign: left
      subtitle:
        textAlign: left
    subtitle: 'Connect with me:'
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-12
          - pb-12
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: LabelsSection
    colors: colors-f
    subtitle: 'Skills:'
    items:
      - type: Label
        label: 'Java'
      - type: Label
        label: 'JavaScript'
      - type: Label
        label: 'React'
      - type: Label
        label: 'Next.js'
      - type: Label
        label: 'Spring Boot'
      - type: Label
        label: 'Python'
      - type: Label
        label: 'SQL'
      - type: Label
        label: 'MongoDB'
      - type: Label
        label: 'RESTful API'
      - type: Label
        label: 'Git'
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-12
          - pb-12
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: TextSection
    variant: variant-a
    subtitle: 'Contact:'
    colors: colors-f
    text: |
      [gaokaining22@gmail.com](mailto:gaokaining22@gmail.com)
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: FeaturedItemsSection
    colors: colors-f
    items:
      - type: FeaturedItem
        subtitle: 'Experience:'
        text: |-
          **ISU NextGen PPT Lab (Feb 2025 - Present)**
          * Research Assistant
          * Developing automated workflows for 3D hand model measurement
          * Creating React web apps for biometric measurements

          **Vermeer (May - Aug 2024)**
          * Parts Picker
          * Utilized inventory systems to track parts and order statuses
          * Coordinated with team members to streamline processes

          **S.V.E Education (May - Aug 2019)**
          * English Teaching Assistant
          * Supported lead teachers with English lessons for non-native speakers
          * Created engaging lesson materials
        styles:
          self:
            textAlign: left
            padding:
              - pt-0
              - pl-0
              - pb-0
              - pr-0
      - type: FeaturedItem
        subtitle: 'Education:'
        text: |-
          **Iowa State University (Aug 2022 - May 2026)**
          * B.S. in Computer Science
          * Relevant coursework: Data Structures, Algorithms, Database Systems, Web Development, Software Engineering
        styles:
          self:
            textAlign: left
            padding:
              - pt-0
              - pl-0
              - pb-0
              - pr-0
    columns: 2
    spacingX: 60
    spacingY: 60
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
          - pt-8
          - pb-8
          - pl-4
          - pr-4
        justifyContent: center
        borderRadius: none
        borderWidth: 0
        borderStyle: none
        borderColor: border-dark
      title:
        textAlign: left
      subtitle:
        textAlign: left
  - type: DividerSection
    styles:
      self:
        width: wide
        padding:
          - pt-12
          - pb-12
          - pl-4
          - pr-4
        justifyContent: center
        borderWidth: 1
        borderStyle: solid
  - type: ContactSection
    backgroundSize: full
    title: "Let's connect! 💬"
    colors: colors-f
    form:
      type: FormBlock
      elementId: contact-form
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
        - name: message
          label: Message
          hideLabel: true
          placeholder: Your message
          isRequired: true
          width: full
          type: TextareaFormControl
      submitLabel: "Send message 🚀"
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
          - pt-12
          - pb-12
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